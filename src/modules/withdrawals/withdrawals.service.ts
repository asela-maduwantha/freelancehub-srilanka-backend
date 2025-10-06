import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Withdrawal } from '../../database/schemas/withdrawal.schema';
import { User } from '../../database/schemas/user.schema';
import { CreateWithdrawalDto, WithdrawalMethod } from './dto/create-withdrawal.dto';
import { ProcessWithdrawalDto } from './dto/process-withdrawal.dto';
import { WithdrawalStatus } from '../../common/enums/withdrawal-status.enum';
import { TransactionLogService } from '../payments/transaction-log.service';
import { StripeService } from '../../services/stripe/stripe.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name);

  constructor(
    @InjectModel(Withdrawal.name) private withdrawalModel: Model<Withdrawal>,
    @InjectModel(User.name) private userModel: Model<User>,
    private transactionLogService: TransactionLogService,
    private stripeService: StripeService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createWithdrawalDto: CreateWithdrawalDto): Promise<Withdrawal> {
    try {
      // Validate user exists and is a freelancer
      const user = await this.userModel.findById(createWithdrawalDto.userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.role !== 'freelancer') {
        throw new ForbiddenException('Only freelancers can request withdrawals');
      }

      // Check for idempotency - prevent duplicate withdrawals
      if (createWithdrawalDto.idempotencyKey) {
        const existingWithdrawal = await this.withdrawalModel.findOne({
          freelancerId: createWithdrawalDto.userId,
          'metadata.idempotencyKey': createWithdrawalDto.idempotencyKey,
          deletedAt: null,
        });
        if (existingWithdrawal) {
          this.logger.log(`Duplicate withdrawal request detected with idempotency key: ${createWithdrawalDto.idempotencyKey}`);
          return existingWithdrawal;
        }
      }

      // Check for maximum pending withdrawals (limit to 3)
      const pendingWithdrawals = await this.withdrawalModel.countDocuments({
        freelancerId: createWithdrawalDto.userId,
        status: { $in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] },
        deletedAt: null,
      });

      if (pendingWithdrawals >= 3) {
        throw new BadRequestException(
          'Maximum pending withdrawals limit reached. Please wait for existing withdrawals to complete.'
        );
      }

      // Check user's available balance from user schema
      const availableBalance = user.freelancerData?.availableBalance || 0;
      if (availableBalance < createWithdrawalDto.amount) {
        throw new BadRequestException(
          `Insufficient available balance for withdrawal. Available: $${availableBalance.toFixed(2)}, Requested: $${createWithdrawalDto.amount.toFixed(2)}`
        );
      }

      // Validate withdrawal method details
      this.validateWithdrawalMethod(createWithdrawalDto);

      // Calculate processing fee (2% for bank transfers, 2.9% + 30¢ for Stripe)
      const processingFee = this.calculateProcessingFee(createWithdrawalDto);
      const finalAmount = createWithdrawalDto.amount - processingFee;

      // Validate minimum withdrawal amount
      if (finalAmount < 10) {
        throw new BadRequestException('Minimum withdrawal amount after fees is $10');
      }

      // CRITICAL FIX: Deduct balance ATOMICALLY when creating withdrawal
      // This prevents race conditions where multiple withdrawals could be created for the same funds
      const updatedUser = await this.userModel.findOneAndUpdate(
        {
          _id: createWithdrawalDto.userId,
          'freelancerData.availableBalance': { $gte: createWithdrawalDto.amount }, // Ensure sufficient balance
        },
        {
          $inc: { 'freelancerData.availableBalance': -createWithdrawalDto.amount },
        },
        { new: true }
      );

      if (!updatedUser) {
        throw new BadRequestException(
          'Failed to reserve withdrawal amount. Please try again or check your balance.'
        );
      }

      this.logger.log(
        `Reserved $${createWithdrawalDto.amount} from user ${createWithdrawalDto.userId} balance. New balance: $${updatedUser.freelancerData?.availableBalance}`
      );

      const withdrawal = new this.withdrawalModel({
        freelancerId: createWithdrawalDto.userId,
        amount: createWithdrawalDto.amount,
        currency: createWithdrawalDto.currency || 'USD',
        finalAmount,
        processingFee,
        description: createWithdrawalDto.description,
        stripeAccountId: createWithdrawalDto.stripeAccountId,
        bankAccount: createWithdrawalDto.method === WithdrawalMethod.BANK_TRANSFER ? {
          accountHolderName: createWithdrawalDto.accountHolderName!,
          accountNumber: createWithdrawalDto.bankAccountNumber!, // Should be encrypted
          routingNumber: createWithdrawalDto.bankRoutingNumber!, // Should be encrypted
          bankName: createWithdrawalDto.bankName!,
          country: 'US', // Default to US
        } : undefined,
        metadata: createWithdrawalDto.idempotencyKey ? {
          idempotencyKey: createWithdrawalDto.idempotencyKey,
        } : undefined,
      });

      let savedWithdrawal: Withdrawal;
      try {
        savedWithdrawal = await withdrawal.save();
      } catch (saveError) {
        // CRITICAL: If withdrawal save fails, refund the balance
        this.logger.error(`Failed to save withdrawal, refunding balance: ${saveError.message}`);
        await this.userModel.findByIdAndUpdate(
          createWithdrawalDto.userId,
          { $inc: { 'freelancerData.availableBalance': createWithdrawalDto.amount } }
        );
        throw new BadRequestException('Failed to create withdrawal. Your balance has been refunded.');
      }

      // Create transaction log for the withdrawal request
      try {
        await this.transactionLogService.create({
          type: 'withdrawal',
          fromUserId: createWithdrawalDto.userId,
          amount: createWithdrawalDto.amount,
          currency: createWithdrawalDto.currency || 'USD',
          fee: processingFee,
          netAmount: finalAmount,
          relatedId: savedWithdrawal._id as Types.ObjectId,
          relatedType: 'withdrawal',
          description: `Withdrawal request: ${createWithdrawalDto.description || 'No description'}`,
          metadata: {
            withdrawalId: savedWithdrawal._id,
            method: createWithdrawalDto.method,
          },
        });
      } catch (logError) {
        this.logger.error(`Failed to log withdrawal transaction: ${logError.message}`);
        // Don't fail the withdrawal if logging fails
      }

      // Send notification
      try {
        await this.notificationsService.notifyWithdrawalRequested(
          (savedWithdrawal._id as Types.ObjectId).toString(),
          savedWithdrawal.amount,
          savedWithdrawal.freelancerId.toString()
        );
      } catch (notificationError) {
        this.logger.error(`Failed to send withdrawal notification: ${notificationError.message}`);
      }

      this.logger.log(`Withdrawal created: ${savedWithdrawal._id} for user: ${createWithdrawalDto.userId}`);
      return savedWithdrawal;
    } catch (error) {
      this.logger.error(`Failed to create withdrawal: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(userId?: string): Promise<Withdrawal[]> {
    const query: any = { deletedAt: null };
    if (userId) {
      query.freelancerId = new Types.ObjectId(userId);
    }

    return this.withdrawalModel
      .find(query)
      .populate('freelancerId', 'firstName lastName email')
      .sort({ requestedAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<Withdrawal> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid withdrawal ID');
    }

    const withdrawal = await this.withdrawalModel
      .findOne({ _id: id, deletedAt: null })
      .populate('freelancerId', 'firstName lastName email')
      .exec();

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    return withdrawal;
  }

  async processWithdrawal(id: string, processDto: ProcessWithdrawalDto): Promise<Withdrawal> {
    const withdrawal = await this.findById(id);

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Withdrawal is not in pending status');
    }

    // If stripeAccountId is provided and no transfer ID exists, execute the transfer
    let transferId = processDto.stripeTransferId;
    let payoutId = processDto.stripePayoutId;

    if (!transferId && withdrawal.stripeAccountId) {
      try {
        // Execute actual Stripe transfer
        const transfer = await this.stripeService.createTransfer(
          withdrawal.finalAmount,
          withdrawal.stripeAccountId,
          withdrawal.currency.toLowerCase(),
          {
            withdrawalId: id,
            freelancerId: withdrawal.freelancerId.toString(),
            description: withdrawal.description || 'Withdrawal payout',
          }
        );
        transferId = transfer.id;
        this.logger.log(`Stripe transfer created: ${transferId} for withdrawal: ${id}`);
      } catch (transferError) {
        this.logger.error(`Failed to create Stripe transfer: ${transferError.message}`);
        throw new BadRequestException(`Failed to execute Stripe transfer: ${transferError.message}`);
      }
    }

    // Update status to processing
    // Validate that processing fee hasn't been tampered with
    if (processDto.processingFee && processDto.processingFee !== withdrawal.processingFee) {
      this.logger.warn(
        `Attempted to change processing fee for withdrawal ${id} from ${withdrawal.processingFee} to ${processDto.processingFee}. Fee is immutable.`
      );
      throw new BadRequestException(
        'Processing fee cannot be changed after withdrawal creation. Cancel and create a new withdrawal if fee adjustment is needed.'
      );
    }

    const updatedWithdrawal = await this.withdrawalModel.findByIdAndUpdate(
      id,
      {
        status: WithdrawalStatus.PROCESSING,
        stripeTransferId: transferId,
        stripePayoutId: payoutId,
        externalTransactionId: processDto.externalTransactionId,
        processedAt: new Date(),
      },
      { new: true }
    ).populate('freelancerId', 'firstName lastName email');

    // Update transaction log
    try {
      await this.transactionLogService.updateByRelatedEntity(
        id,
        'withdrawal',
        {
          status: 'pending', // Still pending until actually transferred
          stripeId: transferId,
          description: `Withdrawal processing started - Transfer ID: ${transferId}`,
        }
      );
    } catch (logError) {
      this.logger.error(`Failed to update withdrawal transaction log: ${logError.message}`);
    }

    return updatedWithdrawal!;
  }

  async completeWithdrawal(id: string): Promise<Withdrawal> {
    const withdrawal = await this.findById(id);

    if (withdrawal.status !== WithdrawalStatus.PROCESSING) {
      throw new BadRequestException('Withdrawal is not in processing status');
    }

    // NOTE: Balance was already deducted when withdrawal was created (PENDING status)
    // This method only updates the status to COMPLETED

    const updatedWithdrawal = await this.withdrawalModel.findByIdAndUpdate(
      id,
      { 
        status: WithdrawalStatus.COMPLETED,
        completedAt: new Date(),
      },
      { new: true }
    ).populate('freelancerId', 'firstName lastName email') as Withdrawal;

    this.logger.log(
      `Withdrawal ${id} completed successfully. Balance was already deducted at creation.`
    );

    // Update transaction log to completed (outside transaction - non-critical)
    try {
      await this.transactionLogService.updateByRelatedEntity(
        id,
        'withdrawal',
        {
          status: 'completed',
          description: `Withdrawal completed successfully`,
        }
      );
    } catch (logError) {
      this.logger.error(`Failed to update withdrawal transaction log: ${logError.message}`);
    }

    // Send completion notification
    try {
      await this.notificationsService.notifyWithdrawalCompleted(
        (updatedWithdrawal!._id as Types.ObjectId).toString(),
        updatedWithdrawal!.finalAmount,
        updatedWithdrawal!.freelancerId.toString()
      );
    } catch (notificationError) {
      this.logger.error(`Failed to send withdrawal completion notification: ${notificationError.message}`);
    }

    return updatedWithdrawal!;
  }

  async failWithdrawal(id: string, errorMessage: string): Promise<Withdrawal> {
    const withdrawal = await this.findById(id);

    if (![WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING].includes(withdrawal.status)) {
      throw new BadRequestException('Withdrawal cannot be failed in current status');
    }

    // CRITICAL FIX: Refund the balance since withdrawal failed
    // Balance was deducted when withdrawal was created
    try {
      await this.userModel.findByIdAndUpdate(
        withdrawal.freelancerId,
        {
          $inc: { 'freelancerData.availableBalance': withdrawal.amount },
        }
      );
      this.logger.log(
        `Refunded $${withdrawal.amount} to user ${withdrawal.freelancerId} after withdrawal failure`
      );
    } catch (refundError) {
      this.logger.error(
        `CRITICAL: Failed to refund balance for failed withdrawal ${id}: ${refundError.message}. Manual reconciliation required!`,
        refundError.stack
      );
      // Continue to update withdrawal status even if refund fails - admin needs to handle manually
    }

    const updatedWithdrawal = await this.withdrawalModel.findByIdAndUpdate(
      id,
      {
        status: WithdrawalStatus.FAILED,
        errorMessage,
        failedAt: new Date(),
      },
      { new: true }
    ).populate('freelancerId', 'firstName lastName email');

    // Update transaction log to failed
    try {
      await this.transactionLogService.updateByRelatedEntity(
        id,
        'withdrawal',
        {
          status: 'failed',
          errorMessage,
          description: `Withdrawal failed: ${errorMessage}. Balance refunded to user.`,
        }
      );
    } catch (logError) {
      this.logger.error(`Failed to update withdrawal transaction log: ${logError.message}`);
    }

    return updatedWithdrawal!;
  }

  private validateWithdrawalMethod(dto: CreateWithdrawalDto): void {
    switch (dto.method) {
      case WithdrawalMethod.BANK_TRANSFER:
        if (!dto.accountHolderName || !dto.bankAccountNumber || !dto.bankRoutingNumber || !dto.bankName) {
          throw new BadRequestException('Bank account details are required for bank transfer withdrawals');
        }
        break;
      case WithdrawalMethod.PAYPAL:
        if (!dto.paypalEmail) {
          throw new BadRequestException('PayPal email is required for PayPal withdrawals');
        }
        break;
      case WithdrawalMethod.STRIPE:
        if (!dto.stripeAccountId) {
          throw new BadRequestException('Stripe account ID is required for Stripe withdrawals');
        }
        break;
      default:
        throw new BadRequestException('Invalid withdrawal method');
    }
  }

  private calculateProcessingFee(dto: CreateWithdrawalDto): number {
    // Simplified fee calculation - in production, this would be more complex
    switch (dto.method) {
      case WithdrawalMethod.BANK_TRANSFER:
        return dto.amount * 0.02; // 2% for bank transfers
      case WithdrawalMethod.PAYPAL:
        return dto.amount * 0.029 + 0.3; // 2.9% + 30¢ for PayPal
      case WithdrawalMethod.STRIPE:
        return dto.amount * 0.029 + 0.3; // 2.9% + 30¢ for Stripe
      default:
        return dto.amount * 0.05; // Default 5% fee
    }
  }
}