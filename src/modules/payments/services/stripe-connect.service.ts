import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { User, UserDocument } from '../../../schemas/user.schema';
import { Payment, PaymentDocument } from '../../../schemas/payment.schema';
import { EmailService } from '../../../common/services/email.service';

@Injectable()
export class StripeConnectService {
  private stripe: Stripe;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('stripe.secretKey') || '',
      {
        apiVersion: '2025-08-27.basil',
      },
    );
  }

  async createStripeAccount(
    userId: string,
  ): Promise<{ accountId: string; onboardingUrl: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.role.includes('freelancer')) {
      throw new BadRequestException(
        'Only freelancers can create Stripe accounts',
      );
    }

    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        individual: {
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
        },
      });

      // Create account link for onboarding
      const accountLink = await this.stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${this.configService.get('app.frontendUrl')}/freelancer/payments`,
        return_url: `${this.configService.get('app.frontendUrl')}/freelancer/payments`,
        type: 'account_onboarding',
      });

      // Update user with Stripe account information
      user.stripeAccountId = account.id;
      user.stripeAccountStatus = 'pending';
      await user.save();

      return {
        accountId: account.id,
        onboardingUrl: accountLink.url,
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to create Stripe account: ' + error.message,
      );
    }
  }

  async getStripeAccountStatus(
    accountId: string,
  ): Promise<{ accountId: string; status: string; details?: any }> {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);

      let status = 'pending';
      if (
        account.details_submitted &&
        account.charges_enabled &&
        account.payouts_enabled
      ) {
        status = 'complete';
      } else if (
        account.requirements?.errors &&
        account.requirements.errors.length > 0
      ) {
        status = 'error';
      }

      // Update user status in database
      const user = await this.userModel.findOne({ stripeAccountId: accountId });
      if (user) {
        user.stripeAccountStatus = status;
        await user.save();
      }

      return {
        accountId: accountId,
        status,
        details: {
          detailsSubmitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          requirements: account.requirements,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to get Stripe account status: ' + error.message,
      );
    }
  }

  async getAccountOnboardingLink(accountId: string): Promise<{ url: string }> {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${this.configService.get('app.frontendUrl')}/freelancer/payments`,
        return_url: `${this.configService.get('app.frontendUrl')}/freelancer/payments`,
        type: 'account_onboarding',
      });

      return { url: accountLink.url };
    } catch (error) {
      throw new BadRequestException(
        'Failed to create onboarding link: ' + error.message,
      );
    }
  }

  async handleStripeWebhook(
    signature: string,
    rawBody: Buffer,
  ): Promise<{ received: boolean }> {
    const endpointSecret = this.configService.get<string>(
      'stripe.webhookSecret',
    );

    if (!endpointSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        endpointSecret,
      );
    } catch (err) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Handle the event
    switch (event.type) {
      case 'account.updated':
        await this.handleAccountUpdated(event.data.object);
        break;
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object);
        break;
      case 'transfer.created':
        console.log('Transfer created:', event.data.object);
        break;
      case 'payout.paid':
        await this.handlePayoutPaid(event.data.object);
        break;
      case 'payout.failed':
        await this.handlePayoutFailed(event.data.object);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object);
        break;
      case 'charge.dispute.created':
        await this.handleDisputeCreated(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ) {
    const payment = await this.paymentModel.findOne({
      stripePaymentIntentId: paymentIntent.id,
    });

    if (payment) {
      // Only update if payment is still pending (first time this webhook fires)
      if (payment.status === 'pending') {
        payment.status = 'processing'; // Payment method attached and confirmed
        payment.paidAt = new Date();
        await payment.save();
        console.log('Payment updated to processing:', payment._id);
      } else if (
        payment.status === 'processing' &&
        paymentIntent.status === 'succeeded'
      ) {
        // If webhook fires again after capture, update to completed
        payment.status = 'completed';
        payment.stripeChargeId = paymentIntent.latest_charge as string;
        await payment.save();
        console.log('Payment updated to completed:', payment._id);
      }
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.paymentModel.findOne({
      stripePaymentIntentId: paymentIntent.id,
    });

    if (payment) {
      payment.status = 'failed';
      await payment.save();
      console.log('Payment updated to failed:', payment._id);
    }
  }

  private async handleAccountUpdated(account: Stripe.Account) {
    const user = await this.userModel.findOne({ stripeAccountId: account.id });
    if (user) {
      if (
        account.details_submitted &&
        account.charges_enabled &&
        account.payouts_enabled
      ) {
        user.stripeAccountStatus = 'complete';
      } else if (
        account.requirements?.errors &&
        account.requirements.errors.length > 0
      ) {
        user.stripeAccountStatus = 'error';
      } else {
        user.stripeAccountStatus = 'incomplete';
      }
      await user.save();
      console.log(
        `Account status updated for user ${user._id}: ${user.stripeAccountStatus}`,
      );
    }
  }

  private async handleTransferFailed(transfer: Stripe.Transfer) {
    console.error('Transfer failed:', transfer.id);
    // Notify admin or user
    // This could trigger a retry or notification
  }

  private async handlePayoutPaid(payout: Stripe.Payout) {
    console.log('Payout paid:', payout.id);
    // Update any withdrawal records if needed
  }

  private async handlePayoutFailed(payout: Stripe.Payout) {
    console.error('Payout failed:', payout.id);
    // Notify user of failed withdrawal
  }

  private async handleChargeRefunded(charge: Stripe.Charge) {
    const payment = await this.paymentModel.findOne({
      stripeChargeId: charge.id,
    });
    if (payment) {
      payment.status = 'refunded';
      await payment.save();
      console.log('Payment refunded via webhook:', payment._id);
    }
  }

  private async handleDisputeCreated(dispute: Stripe.Dispute) {
    const payment = await this.paymentModel.findOne({
      stripeChargeId: dispute.charge,
    });
    if (payment) {
      payment.status = 'disputed';
      await payment.save();
      console.log('Payment disputed:', payment._id);
      // Notify admin and users
    }
  }

  async processManualWithdrawal(
    userId: string,
    amount: number,
    currency: string = 'usd',
  ): Promise<{ payoutId: string; amount: number; status: string }> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.stripeAccountId) {
      throw new NotFoundException('User or Stripe account not found');
    }

    // Check if account is ready for payouts
    const account = await this.stripe.accounts.retrieve(user.stripeAccountId);
    if (!account.charges_enabled || !account.payouts_enabled) {
      throw new BadRequestException('Stripe account not ready for payouts');
    }

    try {
      const payout = await this.stripe.payouts.create(
        {
          amount: Math.round(amount * 100),
          currency,
        },
        {
          stripeAccount: user.stripeAccountId,
        },
      );

      return {
        payoutId: payout.id,
        amount: payout.amount / 100,
        status: payout.status,
      };
    } catch (error) {
      console.error('Manual withdrawal failed:', error);
      throw new BadRequestException('Failed to process withdrawal');
    }
  }
}
