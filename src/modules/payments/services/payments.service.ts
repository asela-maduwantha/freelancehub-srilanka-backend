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
import Stripe from 'stripe';
import { PaymentErrorHandler } from './payment-error-handler.service';
import { EmailService } from '../../../common/services/email.service';
import { NotificationService } from '../../notifications/services/notification.service';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
    private paymentErrorHandler: PaymentErrorHandler,
    private emailService: EmailService,
    private notificationService: NotificationService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('stripe.secretKey') || '',
      {
        apiVersion: '2025-08-27.basil',
      },
    );
  }

  // Create payment for milestone release using Stripe escrow model
  async createPayment(payerId: string, createPaymentDto: CreatePaymentDto) {
    const {
      payeeId,
      projectId,
      milestoneId,
      amount,
      paymentMethod = 'stripe',
      description,
      autoRelease = false,
      autoReleaseDays,
    } = createPaymentDto;


    // Find payee (freelancer) to get their Stripe account
    const payee = await this.userModel.findById(payeeId);
    if (!payee) {
      throw new NotFoundException('Payee not found');
    }

    if (!payee.stripeAccountId) {
      throw new BadRequestException('Payee does not have a Stripe account set up');
    }

    // Find contract for this project - for simplified implementation, we'll assume one contract per project
    const contract = await this.contractModel.findOne({ projectId: projectId });
    if (!contract) {
      throw new NotFoundException('Contract not found for this project');
    }

    // Calculate platform fee (typically 5%)
    const platformFee = Math.round(amount * 0.05 * 100) / 100;
    const netAmount = amount - platformFee;

    // Calculate auto release date if enabled
    let autoReleaseDate: Date | undefined;
    if (autoRelease && autoReleaseDays) {
      autoReleaseDate = new Date();
      
      // For testing purposes, use minutes instead of days if in test mode
      const isTestMode = process.env.NODE_ENV === 'test' || process.env.PAYMENT_TEST_MODE === 'true';
      
      if (isTestMode) {
        // Convert days to minutes for testing (e.g., 7 days = 10080 minutes)
        const minutesForTest = autoReleaseDays * 24 * 60;
        autoReleaseDate.setMinutes(autoReleaseDate.getMinutes() + minutesForTest);
        console.log(`🧪 TEST MODE: Auto-release scheduled for ${minutesForTest} minutes from now (${autoReleaseDate.toISOString()})`);
      } else {
        autoReleaseDate.setDate(autoReleaseDate.getDate() + autoReleaseDays);
        console.log(`📅 Auto-release scheduled for ${autoReleaseDays} days from now (${autoReleaseDate.toISOString()})`);
      }
    }

    // Create Stripe payment intent first
    let stripePaymentIntent: Stripe.PaymentIntent;
    try {
      stripePaymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        payment_method_types: ['card'],
        capture_method: 'manual', // Hold funds in escrow
        transfer_data: {
          destination: payee.stripeAccountId, // Transfer to freelancer's connected account
        },
        application_fee_amount: Math.round(platformFee * 100), // Platform fee
        metadata: {
          contractId: (contract._id as any).toString(),
          projectId,
          payerId,
          payeeId,
          milestoneId: milestoneId || '',
        },
        description: description || `Payment for project ${projectId}`,
      });
    } catch (error) {
      console.error('Stripe payment intent creation failed:', error);
      throw new BadRequestException('Failed to create payment intent with Stripe');
    }

    // Create payment record in escrow model
    const payment = new this.paymentModel({
      contractId: contract._id,
      milestoneId,
      payerId,
      payeeId,
      amount,
      platformFee,
      netAmount,
      currency: 'USD', // Stripe uses USD as default
      paymentMethod,
      stripePaymentIntentId: stripePaymentIntent.id,
      escrowStatus: 'held', // Funds held in escrow until milestone completion
      status: 'pending',
      autoRelease,
      autoReleaseDays,
      autoReleaseDate,
    });

    const savedPayment = await payment.save();

    return {
      paymentId: savedPayment._id,
      message: 'Payment created and funds held in escrow',
      stripePaymentIntent: {
        id: stripePaymentIntent.id,
        clientSecret: stripePaymentIntent.client_secret,
        amount: stripePaymentIntent.amount,
        currency: stripePaymentIntent.currency,
      },
    };
  }

  // Confirm payment with Stripe payment intent
  async confirmPayment(paymentId: string, paymentIntentId: string, userId: string) {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Only the payer can confirm payment
    if (payment.payerId.toString() !== userId) {
      throw new BadRequestException('Only the payer can confirm payment');
    }

    if (payment.status !== 'pending') {
      throw new BadRequestException('Payment is not in pending status');
    }

    // Update payment with Stripe payment intent ID
    payment.stripePaymentIntentId = paymentIntentId;
    // Don't mark as completed yet - wait for webhook confirmation
    payment.status = 'processing'; // Payment method attached, waiting for confirmation
    payment.paidAt = new Date();

    await payment.save();

    return {
      message: 'Payment confirmed successfully',
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
      },
    };
  }

  // Release payment from escrow when milestone is approved
  async releasePayment(paymentId: string, userId: string) {
    try {
      const payment = await this.paymentModel.findById(paymentId);
      this.paymentErrorHandler.handlePaymentValidationError(payment!, userId, 'release');

      this.paymentErrorHandler.logPaymentEvent('PAYMENT_RELEASE_STARTED', paymentId, userId);

      // Capture the payment intent to release funds from escrow
      const paymentIntent = await this.stripe.paymentIntents.capture(
        payment!.stripePaymentIntentId,
        {
          amount_to_capture: Math.round(payment!.netAmount * 100), // Capture only net amount (excluding platform fee)
        }
      );

      // Platform fee is automatically taken via application_fee_amount

      // Update payment status to released
      payment!.escrowStatus = 'released';
      payment!.status = 'completed';
      payment!.releasedAt = new Date();
      payment!.stripeChargeId = paymentIntent.latest_charge as string;

      await payment!.save();

      this.paymentErrorHandler.logPaymentEvent('PAYMENT_RELEASED', paymentId, userId, {
        platformFeeTransferred: payment!.platformFee > 0,
        netAmountReleased: payment!.netAmount,
      });

      // Send notification to freelancer
      const payee = await this.userModel.findById(payment!.payeeId);
      if (payee) {
        await this.emailService.sendPaymentReleasedNotification(
          payee.email,
          payment!.netAmount,
          (payment!._id as any).toString(),
        );

        // Send push notification to freelancer
        try {
          await this.notificationService.createNotification({
            userId: payment!.payeeId.toString(),
            type: 'payment',
            title: 'Payment Released',
            content: `Your payment of $${payment!.netAmount} has been released`,
            relatedEntity: {
              entityType: 'payment',
              entityId: (payment!._id as any).toString(),
            },
          });
        } catch (error) {
          console.error('Failed to create payment notification:', error);
        }
      }

      return {
        message: 'Payment released successfully',
        platformFeeTransferred: payment!.platformFee > 0,
        netAmountReleased: payment!.netAmount
      };
    } catch (error) {
      this.paymentErrorHandler.logPaymentEvent('PAYMENT_RELEASE_FAILED', paymentId, userId, {
        error: error.message,
      });

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      this.paymentErrorHandler.handleStripeError(error, 'releasePayment');
    }
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

    try {
      // Create refund via Stripe
      const refund = await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: Math.round(payment.amount * 100), // Refund full amount
        reason: 'requested_by_customer',
        metadata: {
          paymentId: (payment._id as any).toString(),
          reason,
        },
      });

      // Update payment status
      payment.escrowStatus = 'refunded';
      payment.status = 'refunded';
      payment.stripeRefundId = refund.id;
      await payment.save();

      return { 
        message: 'Payment refunded successfully',
        refundId: refund.id,
        amount: refund.amount / 100,
      };
    } catch (error) {
      console.error('Stripe refund failed:', error);
      throw new BadRequestException('Failed to process refund with Stripe');
    }
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

  // Process auto-releases for testing (can be called manually or via cron)
  async processAutoReleases(): Promise<{ processed: number; errors: string[] }> {
    const now = new Date();
    const paymentsToRelease = await this.paymentModel.find({
      autoRelease: true,
      escrowStatus: 'held',
      autoReleaseDate: { $lte: now },
      status: 'processing', // Only process payments that have been confirmed with payment method
    });

    const results = { processed: 0, errors: [] as string[] };

    for (const payment of paymentsToRelease) {
      try {
        // First check the PaymentIntent status from Stripe
        const paymentIntent = await this.stripe.paymentIntents.retrieve(
          payment.stripePaymentIntentId
        );

        // Only capture if the PaymentIntent is in requires_capture status
        if (paymentIntent.status !== 'requires_capture') {
          results.errors.push(
            `Payment ${(payment._id as any).toString()} PaymentIntent status is ${paymentIntent.status}, cannot capture. Expected: requires_capture`
          );
          console.error(`❌ Cannot capture PaymentIntent ${(payment._id as any).toString()}: status is ${paymentIntent.status}`);
          continue;
        }

        // Capture the payment intent to release funds from escrow
        const capturedIntent = await this.stripe.paymentIntents.capture(
          payment.stripePaymentIntentId,
          {
            amount_to_capture: Math.round(payment.netAmount * 100),
          }
        );

        // Transfer platform fee to platform account
        const platformAccountId = this.configService.get<string>('stripe.platformAccountId');
        if (platformAccountId && payment.platformFee > 0) {
          const transfer = await this.stripe.transfers.create({
            amount: Math.round(payment.platformFee * 100),
            currency: 'usd',
            destination: platformAccountId,
            transfer_group: `payment_${payment._id}`,
            metadata: {
              paymentId: (payment._id as any).toString(),
              type: 'platform_fee',
            },
          });

          payment.stripeTransferId = transfer.id;
          console.log(`💰 Platform fee $${payment.platformFee} transferred to platform account`);
        }

        payment.escrowStatus = 'released';
        payment.status = 'completed';
        payment.releasedAt = now;
        payment.stripeChargeId = capturedIntent.latest_charge as string;
        await payment.save();
        results.processed += 1;
        console.log(`✅ Auto-released payment ${(payment._id as any).toString()} for $${payment.amount} to freelancer ${payment.payeeId}`);
      } catch (error) {
        results.errors.push(`Failed to auto-release payment ${(payment._id as any).toString()}: ${error.message}`);
        console.error(`❌ Auto-release failed for payment ${(payment._id as any).toString()}:`, error.message);
      }
    }

    return results;
  }

  // Clean up stuck payments that never had payment methods attached
  async cleanupStuckPayments(): Promise<{ cleaned: number; errors: string[] }> {
    const stuckPayments = await this.paymentModel.find({
      status: 'pending',
      escrowStatus: 'held',
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Older than 24 hours
    });

    const results = { cleaned: 0, errors: [] as string[] };

    for (const payment of stuckPayments) {
      try {
        // Cancel the PaymentIntent in Stripe
        await this.stripe.paymentIntents.cancel(payment.stripePaymentIntentId);

        // Update payment status
        payment.status = 'cancelled';
        payment.escrowStatus = 'cancelled';
        payment.cancelledAt = new Date();
        await payment.save();

        results.cleaned += 1;
        console.log(`🧹 Cleaned up stuck payment ${(payment._id as any).toString()}`);
      } catch (error) {
        results.errors.push(`Failed to cleanup payment ${(payment._id as any).toString()}: ${error.message}`);
        console.error(`❌ Cleanup failed for payment ${(payment._id as any).toString()}:`, error.message);
      }
    }

    return results;
  }
}
