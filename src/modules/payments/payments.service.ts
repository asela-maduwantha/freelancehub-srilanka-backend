import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment } from '../../database/schemas/payment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFilters } from '../../common/filters/payment.filters';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { TransactionLogService } from './transaction-log.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    private transactionLogService: TransactionLogService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    try {
      // Calculate platform fee and freelancer amount
      const platformFee = (createPaymentDto.amount * createPaymentDto.platformFeePercentage) / 100;
      const freelancerAmount = createPaymentDto.amount - platformFee;

      const payment = new this.paymentModel({
        ...createPaymentDto,
        platformFee,
        freelancerAmount,
        currency: createPaymentDto.currency || 'USD',
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

      this.logger.log(`Payment created: ${savedPayment._id}`);
      return savedPayment;
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create payment');
    }
  }

  async findById(id: string): Promise<Payment> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid payment ID');
    }

    const payment = await this.paymentModel
      .findOne({ _id: id, deletedAt: null })
      .populate('contractId')
      .populate('milestoneId')
      .populate('payerId', 'firstName lastName email')
      .populate('payeeId', 'firstName lastName email')
      .exec();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
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
        .populate('contractId')
        .populate('milestoneId')
        .populate('payerId', 'firstName lastName email')
        .populate('payeeId', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.paymentModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return { payments, total, totalPages };
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
      .populate('contractId')
      .populate('milestoneId')
      .populate('payerId', 'firstName lastName email')
      .populate('payeeId', 'firstName lastName email')
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

    this.logger.log(`Payment updated: ${payment._id}`);
    return payment;
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

    if (payment.status !== PaymentStatus.PROCESSING) {
      throw new BadRequestException('Payment is not in processing status');
    }

    return this.updateById(id, {
      status: PaymentStatus.COMPLETED,
      stripePaymentIntentId,
      stripeChargeId,
      stripeTransferId,
      stripeFee,
    });
  }

  async failPayment(id: string, errorMessage: string): Promise<Payment> {
    const payment = await this.findById(id);

    if (![PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(payment.status)) {
      throw new BadRequestException('Payment cannot be failed in current status');
    }

    // Increment retry count
    const retryCount = payment.retryCount + 1;

    return this.updateById(id, {
      status: PaymentStatus.FAILED,
      errorMessage,
      retryCount,
    });
  }

  async refundPayment(id: string, refundAmount?: number): Promise<Payment> {
    const payment = await this.findById(id);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    const actualRefundAmount = refundAmount || payment.amount;

    // Create refund transaction log (would be implemented if service existed)
    // await this.transactionLogService.create({
    //   transactionId: `refund_${payment._id}_${Date.now()}`,
    //   type: 'refund',
    //   fromUserId: payment.payeeId,
    //   toUserId: payment.payerId,
    //   amount: actualRefundAmount,
    //   currency: payment.currency,
    //   fee: 0,
    //   netAmount: actualRefundAmount,
    //   relatedId: payment._id,
    //   relatedType: 'contract',
    //   description: `Refund for payment ${payment._id}`,
    // });

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

    return this.updateById(id, {
      status: PaymentStatus.PENDING,
      errorMessage: undefined,
    });
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

    return this.paymentModel
      .find({ contractId, deletedAt: null })
      .populate('milestoneId')
      .sort({ createdAt: -1 })
      .exec();
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
}