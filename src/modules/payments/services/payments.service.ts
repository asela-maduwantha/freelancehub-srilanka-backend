import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('stripe.secretKey') || '', {
      apiVersion: '2025-08-27.basil' as any,
    });
  }

  async createPaymentIntent(payerId: string, createPaymentDto: CreatePaymentDto) {
    const { payeeId, projectId, amount, currency = 'usd', description } = createPaymentDto;

    // Calculate platform fee (5%)
    const platformFee = Math.round(amount * 0.05 * 100); // Convert to cents
    const amountInCents = Math.round(amount * 100);

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency,
        metadata: {
          payerId,
          payeeId,
          projectId,
          platformFee: platformFee.toString(),
        },
        description,
        application_fee_amount: platformFee,
        transfer_data: {
          destination: await this.getStripeAccountId(payeeId),
        },
      });

      // Save payment record
      const payment = new this.paymentModel({
        payerId,
        payeeId,
        projectId,
        amount,
        currency,
        stripePaymentIntentId: paymentIntent.id,
        platformFee: {
          fee: platformFee / 100,
          percentage: 5,
          currency,
        },
        description,
        status: 'pending',
        type: createPaymentDto.type || 'project_payment',
        milestoneId: createPaymentDto.milestoneId,
        history: [{
          status: 'pending',
          timestamp: new Date(),
          note: 'Payment intent created',
        }],
      });

      await payment.save();

      return {
        clientSecret: paymentIntent.client_secret,
        paymentId: payment._id,
      };
    } catch (error) {
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  async confirmPayment(paymentId: string, paymentIntentId: string) {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.stripePaymentIntentId !== paymentIntentId) {
      throw new BadRequestException('Payment intent ID mismatch');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        payment.status = 'completed';
        payment.processedAt = new Date();
        payment.history.push({
          status: 'completed',
          timestamp: new Date(),
          note: 'Payment completed successfully',
        });
        await payment.save();

        // Update project payment status
        await this.updateProjectPaymentStatus(payment.projectId, (payment._id as any).toString());

        return { message: 'Payment confirmed successfully' };
      } else if (paymentIntent.status === 'canceled') {
        payment.status = 'cancelled';
        payment.history.push({
          status: 'cancelled',
          timestamp: new Date(),
          note: 'Payment was cancelled',
        });
        await payment.save();

        return { message: 'Payment was cancelled' };
      }
    } catch (error) {
      payment.status = 'failed';
      payment.history.push({
        status: 'failed',
        timestamp: new Date(),
        note: `Payment failed: ${error.message}`,
      });
      await payment.save();
      throw new BadRequestException('Payment confirmation failed');
    }
  }

  async getPayments(userId: string, query: any) {
    const { page = 1, limit = 10, status, type } = query;

    const filter: any = {
      $or: [{ payerId: userId }, { payeeId: userId }],
    };

    if (status) {
      filter.status = status;
    }

    if (type) {
      filter.type = type;
    }

    const payments = await this.paymentModel
      .find(filter)
      .populate('payerId', 'firstName lastName profilePicture')
      .populate('payeeId', 'firstName lastName profilePicture')
      .populate('projectId', 'title')
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
      .populate('payerId', 'firstName lastName profilePicture')
      .populate('payeeId', 'firstName lastName profilePicture')
      .populate('projectId', 'title description');

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async processRefund(paymentId: string, userId: string, reason: string) {
    const payment = await this.paymentModel.findOne({
      _id: paymentId,
      payerId: userId,
      status: 'completed',
    });

    if (!payment) {
      throw new NotFoundException('Payment not found or not eligible for refund');
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        reason: 'requested_by_customer',
        metadata: {
          reason,
        },
      });

      payment.status = 'refunded';
      payment.refund = {
        amount: payment.amount,
        reason,
        processedAt: new Date(),
        stripeRefundId: refund.id,
      };
      payment.history.push({
        status: 'refunded',
        timestamp: new Date(),
        note: `Refund processed: ${reason}`,
      });

      await payment.save();

      return { message: 'Refund processed successfully' };
    } catch (error) {
      throw new BadRequestException('Refund processing failed');
    }
  }

  private async getStripeAccountId(userId: string): Promise<string> {
    // This should retrieve the connected Stripe account ID for the freelancer
    // For now, return a placeholder - in production, you'd store this in the user profile
    return 'acct_placeholder_' + userId;
  }

  private async updateProjectPaymentStatus(projectId: string, paymentId: string) {
    // Update the project with payment information
    // This would typically update the project's payment status
    // Implementation depends on your project schema
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
    });

    return stats;
  }
}
