import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { User, UserDocument } from '../../../schemas/user.schema';
import { EmailService } from '../../../common/services/email.service';

@Injectable()
export class StripeConnectService {
  private stripe: Stripe;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('stripe.secretKey') || '', {
      apiVersion: '2025-08-27.basil',
    });
  }

  async createStripeAccount(userId: string): Promise<{ accountId: string; onboardingUrl: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.role.includes('freelancer')) {
      throw new BadRequestException('Only freelancers can create Stripe accounts');
    }

    // For clean architecture, we'll create a simple account without storing Stripe-specific fields in User schema
    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: 'US', // Default to US since location is not in clean User schema
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        individual: {
          email: user.email,
          first_name: user.name.split(' ')[0] || user.name,
          last_name: user.name.split(' ').slice(1).join(' ') || '',
        },
      });

      // Create account link for onboarding
      const accountLink = await this.stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${this.configService.get('app.frontendUrl')}/freelancer/payments`,
        return_url: `${this.configService.get('app.frontendUrl')}/freelancer/payments`,
        type: 'account_onboarding',
      });

      return {
        accountId: account.id,
        onboardingUrl: accountLink.url,
      };
    } catch (error) {
      throw new BadRequestException('Failed to create Stripe account: ' + error.message);
    }
  }

  async getStripeAccountStatus(accountId: string): Promise<{ accountId: string; status: string; details?: any }> {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);
      
      let status = 'pending';
      if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
        status = 'complete';
      } else if (account.requirements?.errors && account.requirements.errors.length > 0) {
        status = 'error';
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
      throw new BadRequestException('Failed to get Stripe account status: ' + error.message);
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
      throw new BadRequestException('Failed to create onboarding link: ' + error.message);
    }
  }

  async handleStripeWebhook(signature: string, rawBody: Buffer): Promise<{ received: boolean }> {
    const endpointSecret = this.configService.get<string>('stripe.webhookSecret');

    if (!endpointSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
    } catch (err) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Handle the event
    switch (event.type) {
      case 'account.updated':
        console.log('Stripe account updated:', event.data.object);
        break;
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  }
}
