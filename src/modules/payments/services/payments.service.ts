import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from '../../../schemas/payment.schema';
import { Contract, ContractDocument } from '../../../schemas/contract.schema';
import { User, UserDocument } from '../../../schemas/user.schema';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {}

  // Create payment for milestone release using Stripe escrow model
  async createPayment(payerId: string, createPaymentDto: CreatePaymentDto) {
    const {
      payeeId,
      projectId,
      milestoneId,
      amount,
      paymentMethod = 'stripe',
      description,
    } = createPaymentDto;

    // Find contract for this project - for simplified implementation, we'll assume one contract per project
    const contract = await this.contractModel.findOne({ project: projectId });
    if (!contract) {
      throw new NotFoundException('Contract not found for this project');
    }

    // Calculate platform fee (typically 5%)
    const platformFee = Math.round(amount * 0.05 * 100) / 100;
    const netAmount = amount - platformFee;

    // Create payment record in escrow model
    const payment = new this.paymentModel({
      contractId: contract._id,
      milestoneId,
      payerId,
      payeeId,
      amount,
      platformFee,
      netAmount,
      currency: 'LKR', // PayHere uses LKR
      paymentMethod,
      escrowStatus: 'held', // Funds held in escrow until milestone completion
      status: 'pending',
    });

    const savedPayment = await payment.save();

    return {
      paymentId: savedPayment._id,
      message: 'Payment created and funds held in escrow',
    };
  }

  // Release payment from escrow when milestone is approved
  async releasePayment(paymentId: string, userId: string) {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Only the payer (client) can release payment
    if (payment.payerId.toString() !== userId) {
      throw new BadRequestException('Only the client can release payment');
    }

    if (payment.escrowStatus !== 'held') {
      throw new BadRequestException('Payment is not in held status');
    }

    // Update payment status to released
    payment.escrowStatus = 'released';
    payment.status = 'completed';
    payment.releasedAt = new Date();

    await payment.save();

    return { message: 'Payment released successfully' };
  }

  async getPayments(userId: string, query: any) {
    const { page = 1, limit = 10, status, escrowStatus } = query;

    const filter: any = {
      $or: [{ payerId: userId }, { payeeId: userId }],
    };

    if (status) {
      filter.status = status;
    }

    if (escrowStatus) {
      filter.escrowStatus = escrowStatus;
    }

    const payments = await this.paymentModel
      .find(filter)
      .populate('contractId', 'status')
      .populate('payerId', 'username email')
      .populate('payeeId', 'username email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await this.paymentModel.countDocuments(filter);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentById(paymentId: string, userId: string) {
    const payment = await this.paymentModel
      .findOne({
        _id: paymentId,
        $or: [{ payerId: userId }, { payeeId: userId }],
      })
      .populate('contractId', 'status milestones')
      .populate('payerId', 'username email')
      .populate('payeeId', 'username email');

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  // Refund payment (change escrow status to refunded)
  async processRefund(paymentId: string, userId: string, reason: string) {
    const payment = await this.paymentModel.findOne({
      _id: paymentId,
      payerId: userId,
      escrowStatus: 'held',
    });

    if (!payment) {
      throw new NotFoundException(
        'Payment not found or not eligible for refund',
      );
    }

    // Update escrow status to refunded
    payment.escrowStatus = 'refunded';
    payment.status = 'refunded';

    await payment.save();

    return { message: 'Payment refunded successfully' };
  }

  // Helper method for contract integration (if needed)
  private async updateContractPaymentStatus(
    contractId: string,
    paymentId: string,
  ) {
    // Update the contract with payment information
    // This would typically update the contract's milestone payment status
    const contract = await this.contractModel.findById(contractId);
    if (contract) {
      // Implementation depends on contract milestone payment tracking
    }
  }

  async getPaymentStats(userId: string) {
    const payments = await this.paymentModel.find({
      $or: [{ payerId: userId }, { payeeId: userId }],
    });

    const stats = {
      totalPaid: 0,
      totalReceived: 0,
      pendingPayments: 0,
      completedPayments: 0,
      escrowHeld: 0,
      escrowReleased: 0,
    };

    payments.forEach((payment) => {
      if (payment.payerId.toString() === userId) {
        stats.totalPaid += payment.amount;
      } else {
        stats.totalReceived += payment.amount;
      }

      if (payment.status === 'pending') {
        stats.pendingPayments += 1;
      } else if (payment.status === 'completed') {
        stats.completedPayments += 1;
      }

      if (payment.escrowStatus === 'held') {
        stats.escrowHeld += payment.amount;
      } else if (payment.escrowStatus === 'released') {
        stats.escrowReleased += payment.amount;
      }
    });

    return stats;
  }
}
