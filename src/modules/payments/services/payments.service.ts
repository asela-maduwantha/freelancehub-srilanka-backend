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
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
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

  /**
   * Create a payment for a milestone
   */
  async createMilestonePayment(
    contractId: string,
    milestoneId: string,
    amount: number,
    description?: string,
  ): Promise<PaymentDocument> {
    console.log('🔄 Creating milestone payment:', { contractId, milestoneId, amount });

    // Get contract details
    const contract = await this.contractModel.findById(contractId);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Get freelancer details
    const freelancer = await this.userModel.findById(contract.freelancerId);
    if (!freelancer) {
      throw new NotFoundException('Freelancer not found');
    }

    if (!freelancer.stripeAccountId) {
      console.error('❌ Freelancer does not have Stripe account set up:', freelancer._id);
      throw new BadRequestException(
        'Freelancer does not have a Stripe account set up',
      );
    }

    // Calculate platform fee (5%)
    const platformFee = Math.round(amount * 0.05 * 100) / 100;
    const netAmount = amount - platformFee;

    console.log('💰 Payment details:', {
      amount,
      platformFee,
      netAmount,
      freelancerStripeAccount: freelancer.stripeAccountId
    });

    // Create payment record
    const payment = new this.paymentModel({
      contractId: contract._id,
      milestoneId,
      payerId: contract.clientId,
      payeeId: contract.freelancerId,
      amount,
      platformFee,
      netAmount,
      currency: 'USD',
      paymentMethod: 'stripe',
      status: 'pending',
    });

    const savedPayment = await payment.save();
    console.log('✅ Payment record created:', savedPayment._id);

    return savedPayment;
  }

  /**
   * Process payment when milestone is approved
   */
  async processMilestonePayment(
    paymentId: string,
    paymentMethodId: string,
  ): Promise<PaymentDocument> {
    console.log('🔄 Processing milestone payment:', { paymentId, paymentMethodId });

    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) {
      console.error('❌ Payment not found:', paymentId);
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'pending') {
      console.error('❌ Payment is not in pending status:', payment.status);
      throw new BadRequestException('Payment is not in pending status');
    }

    // Get client details
    const client = await this.userModel.findById(payment.payerId);
    if (!client) {
      console.error('❌ Client not found:', payment.payerId);
      throw new NotFoundException('Client not found');
    }

    if (!client.stripeCustomerId) {
      console.error('❌ Client does not have Stripe customer set up:', client._id);
      throw new BadRequestException(
        'Client does not have a Stripe customer set up',
      );
    }

    // Get freelancer details
    const freelancer = await this.userModel.findById(payment.payeeId);
    if (!freelancer) {
      console.error('❌ Freelancer not found:', payment.payeeId);
      throw new NotFoundException('Freelancer not found');
    }

    console.log('👥 Payment parties:', {
      clientId: client._id,
      clientStripeCustomer: client.stripeCustomerId,
      freelancerId: freelancer._id,
      freelancerStripeAccount: freelancer.stripeAccountId
    });

    try {
      console.log('💳 Creating Stripe payment intent...');

      // Create and confirm payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(payment.amount * 100),
        currency: 'usd',
        customer: client.stripeCustomerId,
        payment_method: paymentMethodId,
        transfer_data: {
          destination: freelancer.stripeAccountId,
        },
        application_fee_amount: Math.round(payment.platformFee * 100),
        metadata: {
          paymentId: (payment._id as any).toString(),
          contractId: payment.contractId.toString(),
          milestoneId: payment.milestoneId?.toString(),
        },
        description: `Milestone payment`,
        confirm: true,
        off_session: true,
      });

      console.log('✅ Stripe payment intent created:', {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        client_secret: paymentIntent.client_secret?.substring(0, 20) + '...'
      });

      // Update payment record
      payment.stripePaymentIntentId = paymentIntent.id;
      payment.stripeChargeId = paymentIntent.latest_charge as string;
      payment.status =
        paymentIntent.status === 'succeeded' ? 'completed' : 'failed';
      if (paymentIntent.status === 'succeeded') {
        payment.paidAt = new Date();
      }

      await payment.save();
      console.log('💾 Payment record updated:', {
        id: payment._id,
        status: payment.status,
        stripePaymentIntentId: payment.stripePaymentIntentId
      });

      // Send notification if payment succeeded
      if (payment.status === 'completed') {
        await this.sendPaymentNotification(payment);
      }

      return payment;
    } catch (error) {
      console.error('❌ Payment processing failed:', error);
      payment.status = 'failed';
      await payment.save();
      throw new BadRequestException(
        `Payment processing failed: ${error.message}`,
      );
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(
    paymentId: string,
    userId: string,
  ): Promise<PaymentDocument> {
    const payment = await this.paymentModel
      .findOne({
        _id: paymentId,
        $or: [{ payerId: userId }, { payeeId: userId }],
      })
      .populate('contractId', 'title')
      .populate('payerId', 'firstName lastName email')
      .populate('payeeId', 'firstName lastName email');

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Get payments for a user
   */
  async getUserPayments(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    payments: PaymentDocument[];
    total: number;
    page: number;
    pages: number;
  }> {
    const filter = {
      $or: [{ payerId: userId }, { payeeId: userId }],
    };

    const payments = await this.paymentModel
      .find(filter)
      .populate('contractId', 'title')
      .populate('payerId', 'firstName lastName email')
      .populate('payeeId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await this.paymentModel.countDocuments(filter);

    return {
      payments,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Debug method to get all payments
   */
  async getAllPaymentsForDebug() {
    console.log('🔍 Getting all payments for debug...');
    const payments = await this.paymentModel.find({})
      .populate('contractId', 'title')
      .populate('payerId', 'firstName lastName email')
      .populate('payeeId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(50);

    console.log(`📊 Found ${payments.length} payments`);
    
    return payments.map(payment => ({
      id: payment._id,
      contractId: payment.contractId,
      milestoneId: payment.milestoneId,
      payerId: payment.payerId,
      payeeId: payment.payeeId,
      amount: payment.amount,
      platformFee: payment.platformFee,
      netAmount: payment.netAmount,
      status: payment.status,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      stripeChargeId: payment.stripeChargeId,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    }));
  }

  /**
   * Send payment completion notification
   */
  private async sendPaymentNotification(
    payment: PaymentDocument,
  ): Promise<void> {
    try {
      const freelancer = await this.userModel.findById(payment.payeeId);
      if (freelancer) {
        // Send email notification
        await this.emailService.sendPaymentCompletedNotification(
          freelancer.email,
          payment.netAmount,
          (payment._id as any).toString(),
        );

        // Send in-app notification
        await this.notificationService.createNotification({
          userId: (payment.payeeId as any).toString(),
          type: 'payment',
          title: 'Payment Completed',
          content: `Your payment of $${payment.netAmount} has been completed`,
          relatedEntity: {
            entityType: 'payment',
            entityId: (payment._id as any).toString(),
          },
        });
      }
    } catch (error) {
      console.error('Failed to send payment notification:', error);
    }
  }
}
