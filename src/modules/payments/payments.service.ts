import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment } from '../../database/schemas/payment.schema';
import { Contract } from '../../database/schemas/contract.schema';
import { Milestone } from '../../database/schemas/milestone.schema';
import { User } from '../../database/schemas/user.schema';
import { Job } from '../../database/schemas/job.schema';
import { Proposal } from '../../database/schemas/proposal.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { StripeWebhookDto } from './dto/stripe-webhook.dto';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentFilters } from '../../common/filters/payment.filters';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { ContractStatus } from '../../common/enums/contract-status.enum';
import { JobStatus } from '../../common/enums/job-status.enum';
import { ProposalStatus } from '../../common/enums/proposal-status.enum';
import { TransactionLogService } from './transaction-log.service';
import { StripeService } from '../../services/stripe/stripe.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MilestoneService } from '../milestones/milestones.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  /**
   * Helper function to convert all ObjectIds to strings and preserve Dates recursively
   */
  private convertObjectIdsToStrings(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (obj instanceof Types.ObjectId) {
      return obj.toString();
    }

    if (obj instanceof Date) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.convertObjectIdsToStrings(item));
    }

    if (typeof obj === 'object') {
      const converted: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          converted[key] = this.convertObjectIdsToStrings(obj[key]);
        }
      }
      return converted;
    }

    return obj;
  }

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    @InjectModel(Milestone.name) private milestoneModel: Model<Milestone>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Job.name) private jobModel: Model<Job>,
    @InjectModel(Proposal.name) private proposalModel: Model<Proposal>,
    @InjectModel('ProcessedWebhookEvent') private processedWebhookEventModel: Model<any>,
    @InjectModel('FailedBalanceUpdate') private failedBalanceUpdateModel: Model<any>,
    private transactionLogService: TransactionLogService,
    private stripeService: StripeService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
    @Inject(forwardRef(() => MilestoneService))
    private milestoneService: MilestoneService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    try {
      // Validate contract exists and user has access
      const contract = await this.contractModel.findById(createPaymentDto.contractId);
      if (!contract) {
        throw new BadRequestException('Contract not found');
      }

      // Check if user is authorized (client should be the payer)
      if (contract.clientId.toString() !== createPaymentDto.payerId.toString()) {
        throw new ForbiddenException('Only the contract client can initiate payments');
      }

      // Check if freelancer is the payee
      if (contract.freelancerId.toString() !== createPaymentDto.payeeId.toString()) {
        throw new BadRequestException('Payee must be the contract freelancer');
      }

      // Validate milestone if provided
      if (createPaymentDto.milestoneId) {
        const milestone = await this.milestoneModel.findById(createPaymentDto.milestoneId);
        if (!milestone) {
          throw new BadRequestException('Milestone not found');
        }
        if (milestone.contractId.toString() !== createPaymentDto.contractId.toString()) {
          throw new BadRequestException('Milestone does not belong to the specified contract');
        }
      }

      // Check for existing pending payment for this milestone
      if (createPaymentDto.milestoneId) {
        const existingPayment = await this.paymentModel.findOne({
          milestoneId: createPaymentDto.milestoneId,
          status: { $in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
          deletedAt: null,
        });
        if (existingPayment) {
          throw new BadRequestException('A payment is already pending for this milestone');
        }
      }

      // Validate amount is positive
      if (createPaymentDto.amount <= 0) {
        throw new BadRequestException('Payment amount must be positive');
      }

      // CORRECT FEE CALCULATION:
      // Platform fee is ADDED to contract amount (client pays contract + fee)
      // Freelancer receives the FULL contract amount
      const platformFee = (createPaymentDto.amount * createPaymentDto.platformFeePercentage) / 100;
      const totalClientCharge = createPaymentDto.amount + platformFee; // Client pays this
      const freelancerAmount = createPaymentDto.amount; // Freelancer gets full contract amount

      this.logger.log(
        `Payment calculation - Contract: $${createPaymentDto.amount}, Platform Fee: $${platformFee} (${createPaymentDto.platformFeePercentage}%), Total Client Charge: $${totalClientCharge}`
      );

      // Create Stripe Payment Intent for TOTAL amount (contract + fee)
      const paymentIntent = await this.stripeService.createPaymentIntent(
        totalClientCharge, // Client pays contract amount + platform fee
        createPaymentDto.currency || 'usd',
        {
          contractId: createPaymentDto.contractId.toString(),
          milestoneId: createPaymentDto.milestoneId?.toString() || '',
          payerId: createPaymentDto.payerId.toString(),
          payeeId: createPaymentDto.payeeId.toString(),
          paymentType: createPaymentDto.paymentType,
          platformFeePercentage: createPaymentDto.platformFeePercentage.toString(),
        }
      );

      const payment = new this.paymentModel({
        ...createPaymentDto,
        platformFee,
        freelancerAmount,
        totalClientCharge, // Track total amount charged to client
        currency: createPaymentDto.currency || 'USD',
        stripePaymentIntentId: paymentIntent.id,
      });

      const savedPayment = await payment.save();

      // Log the transaction
      try {
        await this.transactionLogService.create({
          type: 'payment',
          fromUserId: createPaymentDto.payerId,
          toUserId: createPaymentDto.payeeId,
          amount: createPaymentDto.amount,
          currency: createPaymentDto.currency || 'USD',
          fee: platformFee,
          netAmount: freelancerAmount,
          relatedId: createPaymentDto.contractId || createPaymentDto.milestoneId,
          relatedType: createPaymentDto.contractId ? 'contract' : 'milestone',
          stripeId: paymentIntent.id,
          description: `Payment for ${createPaymentDto.contractId ? 'contract' : 'milestone'}`,
          metadata: {
            paymentId: savedPayment._id,
            paymentType: createPaymentDto.paymentType,
            platformFeePercentage: createPaymentDto.platformFeePercentage,
          },
        });
      } catch (logError) {
        this.logger.error(`Failed to log transaction for payment ${savedPayment._id}: ${logError.message}`, logError.stack);
        // Don't fail the payment creation if logging fails
      }

      this.logger.log(`Payment created: ${savedPayment._id} with Stripe PaymentIntent: ${paymentIntent.id}`);

      // Send notification to freelancer about payment sent
      try {
        await this.notificationsService.notifyPaymentSent(
          (savedPayment._id as Types.ObjectId).toString(),
          savedPayment.amount,
          savedPayment.payeeId.toString()
        );
      } catch (notificationError) {
        this.logger.error(`Failed to send payment sent notification: ${notificationError.message}`, notificationError.stack);
        // Don't throw - notification failure shouldn't break payment creation
      }

      return savedPayment;
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create payment');
    }
  }

  /**
   * Get or create Stripe customer for a user
   * This ensures every user has a Stripe customer ID for payment processing
   */
  private async getOrCreateStripeCustomer(userId: string): Promise<string> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // If user already has a Stripe customer ID, return it
      if (user.stripeCustomerId) {
        this.logger.debug(`Using existing Stripe customer: ${user.stripeCustomerId} for user ${userId}`);
        return user.stripeCustomerId;
      }

      // Create new Stripe customer
      const customer = await this.stripeService.createCustomer(
        user.email,
        user.profile?.firstName && user.profile?.lastName 
          ? `${user.profile.firstName} ${user.profile.lastName}` 
          : user.email,
        {
          userId: userId,
          role: user.role,
        }
      );

      // Save customer ID to user record
      user.stripeCustomerId = customer.id;
      await user.save();

      this.logger.log(`Created Stripe customer ${customer.id} for user ${userId}`);
      return customer.id;
    } catch (error) {
      this.logger.error(`Failed to get or create Stripe customer for user ${userId}: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to initialize payment customer');
    }
  }

  async createPaymentIntent(createIntentDto: CreatePaymentIntentDto, userId: string) {
    try {
      this.logger.log(`Creating payment intent for user ${userId}: ${JSON.stringify(createIntentDto)}`);

      // Validate contract if contractId is provided
      let contract: any = null;
      if (!createIntentDto.contractId) {
        throw new BadRequestException('Contract ID is required for payment intent creation');
      }

      contract = await this.contractModel.findById(createIntentDto.contractId);
      if (!contract) {
        throw new BadRequestException('Contract not found');
      }

      // Check if user is authorized (client should be the payer)
      if (contract.clientId.toString() !== userId) {
        throw new ForbiddenException('Only the contract client can create payment intents for this contract');
      }

      // Validate amount is positive
      if (createIntentDto.amount <= 0) {
        throw new BadRequestException('Payment amount must be positive');
      }

      // Get or create Stripe customer for the user
      const stripeCustomerId = await this.getOrCreateStripeCustomer(userId);

      // CORRECT FEE CALCULATION:
      // Platform fee is ADDED to contract amount (client pays contract + fee)
      const platformFeePercentage = contract.platformFeePercentage || 10;
      const platformFee = (createIntentDto.amount * platformFeePercentage) / 100;
      const totalClientCharge = createIntentDto.amount + platformFee; // Client pays this
      const freelancerAmount = createIntentDto.amount; // Freelancer gets full contract amount

      this.logger.log(
        `Payment intent - Contract: $${createIntentDto.amount}, Platform Fee: $${platformFee} (${platformFeePercentage}%), Total Client Charge: $${totalClientCharge}`
      );

      // Create metadata for the payment intent
      const metadata: { [key: string]: string } = {
        userId,
        type: 'contract_payment',
        contractId: contract._id.toString(),
        freelancerId: contract.freelancerId.toString(),
        platformFeePercentage: platformFeePercentage.toString(),
        contractAmount: createIntentDto.amount.toString(),
        platformFeeAmount: platformFee.toString(),
        totalCharge: totalClientCharge.toString(),
        stripeCustomerId,
        ...createIntentDto.metadata,
      };

      // Create the payment intent for TOTAL amount (contract + fee)
      const paymentIntent = await this.stripeService.createPaymentIntent(
        totalClientCharge, // Client pays contract amount + platform fee
        createIntentDto.currency || 'USD',
        metadata,
        createIntentDto.paymentMethodId
      );

      this.logger.log(`Payment intent created: ${paymentIntent.id}`);

      // Create Payment record in database for webhook to update later
      const payment = new this.paymentModel({
        contractId: contract._id,
        milestoneId: null, // Contract-level payment, not milestone-specific
        payerId: new Types.ObjectId(userId),
        payeeId: contract.freelancerId,
        amount: createIntentDto.amount, // Contract amount (what freelancer receives)
        totalClientCharge, // Total charged to client (amount + platform fee)
        currency: (createIntentDto.currency || 'USD').toUpperCase(),
        paymentType: 'milestone', // Contract payment type
        stripePaymentIntentId: paymentIntent.id,
        platformFee,
        platformFeePercentage,
        stripeFee: 0, // Will be updated by webhook
        freelancerAmount,
        status: PaymentStatus.PENDING,
        description: createIntentDto.description || `Payment for contract ${contract.title || contract._id}`,
        metadata: {
          type: 'contract_upfront',
          jobId: (contract.jobId as Types.ObjectId).toString(),
          paymentMethodId: createIntentDto.paymentMethodId,
          ...createIntentDto.metadata,
        },
      });

      const savedPayment = await payment.save();
      this.logger.log(`Payment record created: ${savedPayment._id} for PaymentIntent: ${paymentIntent.id}`);

      // Log the transaction
      try {
        await this.transactionLogService.create({
          type: 'payment',
          fromUserId: new Types.ObjectId(userId),
          toUserId: contract.freelancerId,
          amount: createIntentDto.amount,
          currency: (createIntentDto.currency || 'USD').toUpperCase(),
          fee: platformFee,
          netAmount: freelancerAmount,
          relatedId: contract._id,
          relatedType: 'contract',
          stripeId: paymentIntent.id,
          description: `Payment intent created for contract ${contract.title || contract._id}`,
          metadata: {
            paymentId: savedPayment._id,
            paymentType: 'milestone',
            platformFeePercentage,
          },
        });
      } catch (logError) {
        this.logger.error(`Failed to log transaction for payment ${savedPayment._id}: ${logError.message}`, logError.stack);
        // Don't fail the payment creation if logging fails
      }

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.clientSecret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        metadata: paymentIntent.metadata,
        paymentId: (savedPayment._id as Types.ObjectId).toString(), // Include payment record ID for reference
      };
    } catch (error) {
      this.logger.error(`Failed to create payment intent: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  async findById(id: string): Promise<Payment> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid payment ID');
    }

    const payment = await this.paymentModel
      .findOne({ _id: id, deletedAt: null })
      .populate('contractId', 'title status totalAmount currency')
      .populate('milestoneId', 'title amount currency status')
      .populate('payerId', 'profile.firstName profile.lastName email')
      .populate('payeeId', 'profile.firstName profile.lastName email')
      .lean({ virtuals: true })
      .exec();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.convertObjectIdsToStrings(payment);
  }

  async findAll(
    filters: PaymentFilters = {},
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<{ payments: Payment[]; total: number; totalPages: number }> {
    const query: any = { deletedAt: null };

    // Apply filters
    if (filters.contractId) query.contractId = filters.contractId;
    if (filters.milestoneId) query.milestoneId = filters.milestoneId;
    if (filters.payerId) query.payerId = filters.payerId;
    if (filters.payeeId) query.payeeId = filters.payeeId;
    if (filters.status) query.status = filters.status;
    if (filters.paymentType) query.paymentType = filters.paymentType;
    
    if (filters.dateRange) {
      query.createdAt = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end,
      };
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [payments, total] = await Promise.all([
      this.paymentModel
        .find(query)
        .populate('contractId', 'title status totalAmount currency')
        .populate('milestoneId', 'title amount currency status')
        .populate('payerId', 'profile.firstName profile.lastName email')
        .populate('payeeId', 'profile.firstName profile.lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true })
        .exec(),
      this.paymentModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Convert all ObjectIds to strings
    const convertedPayments = this.convertObjectIdsToStrings(payments);

    return { payments: convertedPayments, total, totalPages };
  }

  async updateById(id: string, updateData: Partial<Payment>): Promise<Payment> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid payment ID');
    }

    const payment = await this.paymentModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { 
          ...updateData,
          ...(updateData.status && this.getStatusTimestamp(updateData.status))
        },
        { new: true }
      )
      .populate('contractId', 'title status totalAmount currency')
      .populate('milestoneId', 'title amount currency status')
      .populate('payerId', 'profile.firstName profile.lastName email')
      .populate('payeeId', 'profile.firstName profile.lastName email')
      .exec();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Update transaction log if status changed
    if (updateData.status) {
      // Transaction log update would go here if service existed
      // await this.transactionLogService.updateByTransactionId(
      //   `payment_${payment._id}`,
      //   { status: this.mapPaymentStatusToTransactionStatus(updateData.status) }
      // );
    }

    // Send notification when payment is completed
    if (updateData.status === PaymentStatus.COMPLETED) {
      try {
        await this.notificationsService.notifyPaymentReceived(
          (payment._id as Types.ObjectId).toString(),
          payment.amount,
          payment.payeeId.toString()
        );
      } catch (notificationError) {
        this.logger.error(`Failed to send payment received notification: ${notificationError.message}`, notificationError.stack);
        // Don't throw - notification failure shouldn't break payment completion
      }
    }

    // Send notification when payment is refunded
    if (updateData.status === PaymentStatus.REFUNDED) {
      try {
        await this.notificationsService.notifyPaymentRefunded(
          (payment._id as Types.ObjectId).toString(),
          payment.amount,
          payment.payeeId.toString()
        );
      } catch (notificationError) {
        this.logger.error(`Failed to send payment refunded notification: ${notificationError.message}`, notificationError.stack);
        // Don't throw - notification failure shouldn't break payment refund
      }
    }

    const plainPayment = payment.toObject({ virtuals: true });
    this.logger.log(`Payment updated: ${payment._id}`);
    return this.convertObjectIdsToStrings(plainPayment);
  }

  async processPayment(id: string): Promise<Payment> {
    const payment = await this.findById(id);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment is not in pending status');
    }

    return this.updateById(id, { status: PaymentStatus.PROCESSING });
  }

  async completePayment(
    id: string,
    stripePaymentIntentId: string,
    stripeChargeId?: string,
    stripeTransferId?: string,
    stripeFee: number = 0
  ): Promise<Payment> {
    const payment = await this.findById(id);

    if (payment.status !== PaymentStatus.PROCESSING && payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment is not in pending or processing status');
    }

    // Try to start MongoDB transaction for atomicity (only works with replica sets)
    let session: any = null;
    let useTransaction = false;

    try {
      session = await this.paymentModel.db.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch (error) {
      // Transactions not supported (standalone MongoDB), continue without transaction
      this.logger.warn('MongoDB transactions not supported, continuing without transaction');
      session = null;
      useTransaction = false;
    }

    let updatedPayment: Payment;

    try {
      // Update payment status
      updatedPayment = await this.paymentModel.findByIdAndUpdate(
        id,
        {
          status: PaymentStatus.COMPLETED,
          stripePaymentIntentId,
          stripeChargeId,
          stripeTransferId,
          stripeFee,
        },
        useTransaction ? { new: true, session } : { new: true }
      ).exec() as any;

    // Log the completed payment transaction
    try {
      await this.transactionLogService.updateByStripeId(stripePaymentIntentId, {
        status: 'completed',
        stripeId: stripeChargeId,
        description: `Payment completed - Charge: ${stripeChargeId}`,
        metadata: {
          stripeFee,
          stripeTransferId,
        },
      });

      // Log platform fee as separate transaction
      if (payment.platformFee > 0) {
        await this.transactionLogService.create({
          transactionId: `fee_${payment._id}_${Date.now()}`,
          type: 'fee',
          fromUserId: payment.payerId,
          toUserId: undefined, // Platform fee goes to platform
          amount: payment.platformFee,
          currency: payment.currency,
          fee: 0,
          netAmount: payment.platformFee,
          relatedId: payment._id as Types.ObjectId,
          relatedType: 'contract',
          stripeId: stripeChargeId,
          description: `Platform fee for payment ${payment._id}`,
          metadata: {
            paymentId: payment._id,
            feeType: 'platform',
            feePercentage: (payment.platformFee / payment.amount) * 100,
          },
        });
      }

      // Log Stripe fee if applicable
      if (stripeFee > 0) {
        await this.transactionLogService.create({
          transactionId: `stripe_fee_${payment._id}_${Date.now()}`,
          type: 'fee',
          fromUserId: payment.payerId,
          toUserId: undefined, // Stripe fee goes to Stripe
          amount: stripeFee / 100, // Convert from cents
          currency: payment.currency,
          fee: 0,
          netAmount: stripeFee / 100,
          relatedId: payment._id as Types.ObjectId,
          relatedType: 'contract',
          stripeId: stripeChargeId,
          description: `Stripe processing fee for payment ${payment._id}`,
          metadata: {
            paymentId: payment._id,
            feeType: 'stripe',
            stripeFeeCents: stripeFee,
          },
        });
      }
    } catch (logError) {
      this.logger.error(`Failed to log transactions for completed payment ${id}: ${logError.message}`, logError.stack);
    }

      // Update contract totalPaid for upfront payments and activate contract
      if (payment.metadata?.type === 'contract_upfront' && payment.contractId) {
        // Update contract: set as ACTIVE and update totalPaid (with transaction)
        const contract = await this.contractModel.findByIdAndUpdate(
          payment.contractId,
          {
            totalPaid: payment.amount,
            status: ContractStatus.ACTIVE
          },
          { new: true, session }
        ).populate('jobId', 'title');
        
        if (contract) {
          this.logger.log(`Contract ${payment.contractId} ACTIVATED after successful payment: ${payment.amount}`);

          // CORRECT BALANCE UPDATE:
          // Freelancer receives FULL contract amount (platform fee already paid by client)
          await this.userModel.findByIdAndUpdate(
            payment.payeeId,
            { 
              $inc: { 
                'freelancerData.pendingBalance': payment.amount // Full contract amount
              } 
            },
            useTransaction ? { session } : {}
          );
          this.logger.log(
            `Updated freelancer ${payment.payeeId} pending balance: +$${payment.amount} (full contract amount, platform fee paid separately by client)`
          );

          // Update associated job status to CONTRACTED
          if (payment.metadata?.jobId) {
            await this.jobModel.findByIdAndUpdate(
              payment.metadata.jobId,
              {
                status: JobStatus.CONTRACTED
              },
              useTransaction ? { session } : {}
            );
            this.logger.log(`Job ${payment.metadata.jobId} status set to CONTRACTED after successful payment`);
          }
        }
      }

      // Commit transaction if using transactions
      if (useTransaction && session) {
        await session.commitTransaction();
        this.logger.log(`Transaction committed successfully for payment ${id}`);
      }

      // Send notifications AFTER transaction committed (non-critical operations)
      if (payment.metadata?.type === 'contract_upfront' && payment.contractId) {
        try {
          const contract = await this.contractModel.findById(payment.contractId).populate('jobId', 'title');
          if (contract) {
            const jobTitle = (contract.jobId as any)?.title || 'a contract';
            await this.notificationsService.notifyContractCreated(
              payment.contractId.toString(),
              jobTitle,
              payment.payeeId.toString()
            );
            this.logger.log(`Sent contract notification to freelancer ${payment.payeeId} after payment completion`);
          }
        } catch (notificationError) {
          this.logger.error(`Failed to send contract notification: ${notificationError.message}`, notificationError.stack);
          // Don't fail - notification is non-critical
        }
      }

    } catch (error) {
      // Rollback transaction on any error if using transactions
      if (useTransaction && session) {
        await session.abortTransaction();
      }
      this.logger.error(`Operation failed for payment ${id}: ${error.message}`, error.stack);

      // If balance update failed, log for manual reconciliation
      if (error.message.includes('balance') || error.message.includes('freelancer')) {
        try {
          await this.failedBalanceUpdateModel.create({
            paymentId: payment._id,
            freelancerId: payment.payeeId,
            amount: payment.amount - payment.platformFee,
            currency: payment.currency,
            error: error.message,
            status: 'pending',
            retryCount: 0,
            metadata: {
              stripePaymentIntentId,
              stripeChargeId,
            }
          });
          this.logger.error(`CRITICAL: Logged failed balance update for payment ${payment._id} - requires manual reconciliation`);
        } catch (logError) {
          this.logger.error(`Failed to log failed balance update: ${logError.message}`);
        }
      }

      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }

    // Log completed transactions (outside transaction - non-critical)
    try {
      await this.transactionLogService.updateByStripeId(stripePaymentIntentId, {
        status: 'completed',
        stripeId: stripeChargeId,
        description: `Payment completed - Charge: ${stripeChargeId}`,
        metadata: {
          stripeFee,
          stripeTransferId,
        },
      });

      // Log platform fee as separate transaction
      if (payment.platformFee > 0) {
        await this.transactionLogService.create({
          transactionId: `fee_${payment._id}_${Date.now()}`,
          type: 'fee',
          fromUserId: payment.payerId,
          toUserId: undefined,
          amount: payment.platformFee,
          currency: payment.currency,
          fee: 0,
          netAmount: payment.platformFee,
          relatedId: payment._id as Types.ObjectId,
          relatedType: 'contract',
          stripeId: stripeChargeId,
          description: `Platform fee for payment ${payment._id}`,
          metadata: {
            paymentId: payment._id,
            feeType: 'platform',
            feePercentage: (payment.platformFee / payment.amount) * 100,
          },
        });
      }

      // Log Stripe fee if applicable
      if (stripeFee > 0) {
        await this.transactionLogService.create({
          transactionId: `stripe_fee_${payment._id}_${Date.now()}`,
          type: 'fee',
          fromUserId: payment.payerId,
          toUserId: undefined,
          amount: stripeFee / 100,
          currency: payment.currency,
          fee: 0,
          netAmount: stripeFee / 100,
          relatedId: payment._id as Types.ObjectId,
          relatedType: 'contract',
          stripeId: stripeChargeId,
          description: `Stripe processing fee for payment ${payment._id}`,
          metadata: {
            paymentId: payment._id,
            feeType: 'stripe',
            stripeFeeCents: stripeFee,
          },
        });
      }
    } catch (logError) {
      this.logger.error(`Failed to log transactions for completed payment ${id}: ${logError.message}`, logError.stack);
      // Don't fail - logging is non-critical
    }

    return updatedPayment;
  }  async failPayment(id: string, errorMessage: string): Promise<Payment> {
    const payment = await this.findById(id);

    if (![PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(payment.status)) {
      throw new BadRequestException('Payment cannot be failed in current status');
    }

    // Increment retry count
    const retryCount = payment.retryCount + 1;

    const updatedPayment = await this.updateById(id, {
      status: PaymentStatus.FAILED,
      errorMessage,
      retryCount,
    });

    // Update transaction log status
    try {
      if (payment.stripePaymentIntentId) {
        await this.transactionLogService.updateByStripeId(payment.stripePaymentIntentId, {
          status: 'failed',
          errorMessage,
          description: `Payment failed: ${errorMessage}`,
        });
      }
    } catch (logError) {
      this.logger.error(`Failed to update transaction log for failed payment ${id}: ${logError.message}`, logError.stack);
    }

    return updatedPayment;
  }

  async refundPayment(id: string, refundAmount?: number): Promise<Payment> {
    const payment = await this.findById(id);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    const actualRefundAmount = refundAmount || payment.amount;

    // Create refund transaction log
    try {
      await this.transactionLogService.create({
        transactionId: `refund_${payment._id}_${Date.now()}`,
        type: 'refund',
        fromUserId: payment.payeeId,
        toUserId: payment.payerId,
        amount: actualRefundAmount,
        currency: payment.currency,
        fee: 0,
        netAmount: actualRefundAmount,
        relatedId: payment._id as Types.ObjectId,
        relatedType: 'contract',
        description: `Refund for payment ${payment._id}`,
        metadata: {
          originalPaymentId: payment._id,
          refundAmount: actualRefundAmount,
        },
      });
    } catch (logError) {
      this.logger.error(`Failed to log refund transaction for payment ${id}: ${logError.message}`, logError.stack);
    }

    return this.updateById(id, { status: PaymentStatus.REFUNDED });
  }

  async retryPayment(id: string): Promise<Payment> {
    const payment = await this.findById(id);

    if (payment.status !== PaymentStatus.FAILED) {
      throw new BadRequestException('Only failed payments can be retried');
    }

    if (payment.retryCount >= 3) {
      throw new BadRequestException('Maximum retry attempts exceeded');
    }

    // Reset payment to pending status and increment retry count
    const updatedPayment = await this.updateById(id, {
      status: PaymentStatus.PENDING,
      retryCount: payment.retryCount + 1,
      errorMessage: undefined, // Clear previous error
    });

    // Attempt to recreate the payment intent with Stripe
    try {
      const paymentIntent = await this.stripeService.createPaymentIntent(
        payment.amount,
        payment.currency,
        {
          contractId: payment.contractId.toString(),
          milestoneId: payment.milestoneId?.toString() || '',
          payerId: payment.payerId.toString(),
          payeeId: payment.payeeId.toString(),
          paymentType: payment.paymentType,
          retryAttempt: (payment.retryCount + 1).toString(),
          originalPaymentId: (payment._id as Types.ObjectId).toString(),
        }
      );

      // Update with new payment intent
      await this.updateById(id, {
        stripePaymentIntentId: paymentIntent.id,
        status: PaymentStatus.PENDING,
      });

      this.logger.log(`Payment retry initiated: ${id} with new PaymentIntent: ${paymentIntent.id}`);

      // Send retry notification (using existing notification method)
      try {
        await this.notificationsService.notifyPaymentSent(
          (payment._id as Types.ObjectId).toString(),
          payment.amount,
          payment.payerId.toString()
        );
      } catch (notificationError) {
        this.logger.error(`Failed to send payment retry notification: ${notificationError.message}`);
      }

    } catch (stripeError) {
      // If Stripe fails, mark as failed again with incremented retry count
      await this.updateById(id, {
        status: PaymentStatus.FAILED,
        errorMessage: `Retry failed: ${stripeError.message}`,
      });

      this.logger.error(`Payment retry failed for ${id}: ${stripeError.message}`);
      throw new BadRequestException(`Payment retry failed: ${stripeError.message}`);
    }

    return updatedPayment;
  }

  async deleteById(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid payment ID');
    }

    const payment = await this.paymentModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { deletedAt: new Date() },
        { new: true }
      )
      .exec();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    this.logger.log(`Payment soft deleted: ${payment._id}`);
  }

  // Contract-specific methods
  async findByContractId(contractId: string): Promise<Payment[]> {
    if (!Types.ObjectId.isValid(contractId)) {
      throw new BadRequestException('Invalid contract ID');
    }

    const payments = await this.paymentModel
      .find({ contractId, deletedAt: null })
      .populate('milestoneId', 'title amount currency status')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true })
      .exec();
    
    return this.convertObjectIdsToStrings(payments);
  }

  async getTotalPaidByContract(contractId: string): Promise<number> {
    if (!Types.ObjectId.isValid(contractId)) {
      throw new BadRequestException('Invalid contract ID');
    }

    const result = await this.paymentModel.aggregate([
      {
        $match: {
          contractId: new Types.ObjectId(contractId),
          status: PaymentStatus.COMPLETED,
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  async getPaymentStats(
    userId: string,
    userType: 'payer' | 'payee',
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalAmount: number;
    totalPayments: number;
    totalFees: number;
    statusBreakdown: Record<PaymentStatus, number>;
  }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const userField = userType === 'payer' ? 'payerId' : 'payeeId';
    const matchQuery: any = {
      [userField]: new Types.ObjectId(userId),
      deletedAt: null,
    };

    if (dateRange) {
      matchQuery.createdAt = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const [statsResult, statusResult] = await Promise.all([
      this.paymentModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalPayments: { $sum: 1 },
            totalFees: { $sum: { $add: ['$platformFee', '$stripeFee'] } },
          },
        },
      ]),
      this.paymentModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const stats = statsResult.length > 0 ? statsResult[0] : {
      totalAmount: 0,
      totalPayments: 0,
      totalFees: 0,
    };

    const statusBreakdown: Record<PaymentStatus, number> = Object.values(PaymentStatus)
      .reduce((acc, status) => {
        acc[status] = 0;
        return acc;
      }, {} as Record<PaymentStatus, number>);

    statusResult.forEach(item => {
      statusBreakdown[item._id] = item.count;
    });

    return {
      ...stats,
      statusBreakdown,
    };
  }

  // Private helper methods
  private getStatusTimestamp(status: PaymentStatus): Record<string, Date> | {} {
    const now = new Date();
    switch (status) {
      case PaymentStatus.PROCESSING:
        return { processedAt: now };
      case PaymentStatus.FAILED:
        return { failedAt: now };
      case PaymentStatus.REFUNDED:
        return { refundedAt: now };
      default:
        return {};
    }
  }

  private mapPaymentStatusToTransactionStatus(paymentStatus: PaymentStatus): string {
    switch (paymentStatus) {
      case PaymentStatus.PENDING:
      case PaymentStatus.PROCESSING:
        return 'pending';
      case PaymentStatus.COMPLETED:
        return 'completed';
      case PaymentStatus.FAILED:
        return 'failed';
      case PaymentStatus.REFUNDED:
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  // Stripe webhook handling
  async handleStripeWebhook(
    webhookData: StripeWebhookDto,
    rawBody: string,
    signature: string
  ): Promise<{ received: boolean; skipped?: boolean }> {
    try {
      // TEMPORARILY DISABLE SIGNATURE VERIFICATION FOR TESTING
      const skipSignatureVerification = this.configService.get<string>('STRIPE_SKIP_SIGNATURE_VERIFICATION') === 'true';

      let event: any;

      if (skipSignatureVerification) {
        // Skip signature verification - use webhook data directly
        this.logger.warn('WARNING: Stripe webhook signature verification is DISABLED for testing');
        event = webhookData;
      } else {
        // Verify webhook signature for security
        const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
        if (!webhookSecret) {
          throw new BadRequestException('Stripe webhook secret is not configured');
        }

        // Construct and verify the event
        event = this.stripeService.constructEvent(rawBody, signature, webhookSecret);
      }

      const { type, data, id: eventId } = event;

      // IDEMPOTENCY CHECK: Verify if this event has already been processed
      const existingEvent = await this.processedWebhookEventModel.findOne({ stripeEventId: eventId });
      if (existingEvent) {
        this.logger.log(`Webhook event ${eventId} (${type}) already processed at ${existingEvent.processedAt}, skipping`);
        return { received: true, skipped: true };
      }

      this.logger.log(`Processing Stripe webhook: ${type} (Event ID: ${eventId})`)

      switch (type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(data.object);
          break;

        case 'charge.succeeded':
          await this.handleChargeSucceeded(data.object);
          break;

        case 'charge.dispute.created':
          await this.handleChargeDispute(data.object);
          break;

        case 'account.updated':
          await this.handleAccountUpdated(data.object);
          break;

        case 'account.application.deauthorized':
          await this.handleAccountDeauthorized(data.object);
          break;

        case 'transfer.created':
          await this.handleTransferCreated(data.object);
          break;

        case 'transfer.updated':
          await this.handleTransferUpdated(data.object);
          break;

        case 'transfer.failed':
          await this.handleTransferFailed(data.object);
          break;

        case 'payout.paid':
          await this.handlePayoutPaid(data.object);
          break;

        case 'payout.failed':
          await this.handlePayoutFailed(data.object);
          break;

        default:
          this.logger.log(`Unhandled webhook type: ${type}`);
      }

      // Mark event as processed to prevent duplicate processing
      await this.processedWebhookEventModel.create({
        stripeEventId: eventId,
        eventType: type,
        processedAt: new Date(),
        metadata: {
          objectId: data?.object?.id,
        }
      });

      this.logger.log(`Successfully processed and recorded webhook event ${eventId} (${type})`);

      return { received: true };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);
      throw new BadRequestException('Invalid webhook signature or processing failed');
    }
  }

  private async handleChargeSucceeded(charge: any): Promise<void> {
    const payment = await this.paymentModel.findOne({
      stripePaymentIntentId: charge.payment_intent
    });

    if (!payment) {
      this.logger.warn(`Payment not found for charge: ${charge.id} with PaymentIntent: ${charge.payment_intent}`);
      return;
    }

    if (payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.PROCESSING) {
      await this.completePayment(
        (payment._id as any).toString(),
        charge.payment_intent,
        charge.id,
        undefined, // transfer_data not available in charge
        charge.fee_details?.[0]?.amount || 0
      );
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: any): Promise<void> {
    const payment = await this.paymentModel.findOne({
      stripePaymentIntentId: paymentIntent.id
    });

    if (!payment) {
      this.logger.warn(`Payment not found for PaymentIntent: ${paymentIntent.id}`);
      return;
    }

    if (payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.PROCESSING) {
      // Extract charge details safely - charges might not be expanded in payment_intent events
      const chargeId = paymentIntent.charges?.data?.[0]?.id || paymentIntent.latest_charge;
      const stripeFee = paymentIntent.charges?.data?.[0]?.fee_details?.[0]?.amount || 0;
      const transferDestination = paymentIntent.transfer_data?.destination;

      await this.completePayment(
        (payment._id as any).toString(),
        paymentIntent.id,
        chargeId,
        transferDestination,
        stripeFee
      );

      // Note: Milestone payment processing is now handled through upfront contract payments
      // Individual milestone payments are no longer created
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: any): Promise<void> {
    const payment = await this.paymentModel.findOne({
      stripePaymentIntentId: paymentIntent.id
    });

    if (!payment) {
      this.logger.warn(`Payment not found for PaymentIntent: ${paymentIntent.id}`);
      return;
    }

    if (payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.PROCESSING) {
      await this.failPayment(
        (payment._id as any).toString(),
        paymentIntent.last_payment_error?.message || 'Payment failed'
      );
    }
  }

  private async handleChargeDispute(dispute: any): Promise<void> {
    // Handle charge disputes - could mark payment as disputed
    this.logger.log(`Charge dispute created: ${dispute.id} for charge: ${dispute.charge}`);

    // Update transaction log status
    await this.transactionLogService.updateByStripeId(dispute.charge, {
      status: 'failed',
      description: `Dispute created: ${dispute.reason}`,
    });
  }

  // Stripe Connected Account Webhook Handlers
  private async handleAccountUpdated(account: any): Promise<void> {
    this.logger.log(`Account updated: ${account.id}`);

    try {
      // Find user by Stripe account ID
      const user = await this.userModel.findOne({ stripeAccountId: account.id });
      if (!user) {
        this.logger.warn(`User not found for Stripe account: ${account.id}`);
        return;
      }

      this.logger.log(`Account updated for user: ${user._id}, charges_enabled: ${account.charges_enabled}, payouts_enabled: ${account.payouts_enabled}`);

      // You could send notifications to user about account status changes
      if (account.charges_enabled && account.payouts_enabled) {
        // Account is fully enabled
        this.logger.log(`Stripe account fully enabled for user: ${user._id}`);
      } else if (account.requirements?.currently_due?.length > 0) {
        // Account has pending requirements
        this.logger.log(`Stripe account has pending requirements for user: ${user._id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle account update: ${error.message}`, error.stack);
    }
  }

  private async handleAccountDeauthorized(application: any): Promise<void> {
    this.logger.log(`Account deauthorized: ${application.account}`);

    try {
      // Find user by Stripe account ID
      const user = await this.userModel.findOne({ stripeAccountId: application.account });
      if (!user) {
        this.logger.warn(`User not found for deauthorized account: ${application.account}`);
        return;
      }

      // Clear the Stripe account ID from user
      user.stripeAccountId = undefined;
      await user.save();

      this.logger.log(`Stripe account disconnected for user: ${user._id}`);

      // You could send notification to user about disconnection
    } catch (error) {
      this.logger.error(`Failed to handle account deauthorization: ${error.message}`, error.stack);
    }
  }

  // Transfer and Payout Webhook Handlers
  private async handleTransferCreated(transfer: any): Promise<void> {
    this.logger.log(`Transfer created: ${transfer.id} to ${transfer.destination}`);

    // You could update withdrawal status or create transaction log
    try {
      const withdrawalId = transfer.metadata?.withdrawalId;
      if (withdrawalId) {
        await this.transactionLogService.updateByRelatedEntity(
          withdrawalId,
          'withdrawal',
          {
            stripeId: transfer.id,
            status: 'pending',
            description: `Transfer created: ${transfer.id}`,
          }
        );
      }
    } catch (error) {
      this.logger.error(`Failed to handle transfer created: ${error.message}`);
    }
  }

  private async handleTransferUpdated(transfer: any): Promise<void> {
    this.logger.log(`Transfer updated: ${transfer.id}, status: ${transfer.status}`);
    // Handle transfer status updates if needed
  }

  private async handleTransferFailed(transfer: any): Promise<void> {
    this.logger.log(`Transfer failed: ${transfer.id}`);

    try {
      const withdrawalId = transfer.metadata?.withdrawalId;
      if (withdrawalId) {
        // Update transaction log
        await this.transactionLogService.updateByRelatedEntity(
          withdrawalId,
          'withdrawal',
          {
            status: 'failed',
            errorMessage: transfer.failure_message || 'Transfer failed',
            description: `Transfer failed: ${transfer.failure_message}`,
          }
        );

        // You could also update the withdrawal record status
        this.logger.error(`Transfer failed for withdrawal: ${withdrawalId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle transfer failure: ${error.message}`);
    }
  }

  private async handlePayoutPaid(payout: any): Promise<void> {
    this.logger.log(`Payout paid: ${payout.id}, amount: ${payout.amount / 100}`);

    // Handle successful payout - could update withdrawal status to completed
    try {
      const metadata = payout.metadata || {};
      const withdrawalId = metadata.withdrawalId;

      if (withdrawalId) {
        await this.transactionLogService.updateByRelatedEntity(
          withdrawalId,
          'withdrawal',
          {
            status: 'completed',
            description: `Payout completed: ${payout.id}`,
          }
        );
      }
    } catch (error) {
      this.logger.error(`Failed to handle payout paid: ${error.message}`);
    }
  }

  private async handlePayoutFailed(payout: any): Promise<void> {
    this.logger.log(`Payout failed: ${payout.id}`);

    try {
      const metadata = payout.metadata || {};
      const withdrawalId = metadata.withdrawalId;

      if (withdrawalId) {
        await this.transactionLogService.updateByRelatedEntity(
          withdrawalId,
          'withdrawal',
          {
            status: 'failed',
            errorMessage: payout.failure_message || 'Payout failed',
            description: `Payout failed: ${payout.failure_message}`,
          }
        );
      }
    } catch (error) {
      this.logger.error(`Failed to handle payout failure: ${error.message}`);
    }
  }
}