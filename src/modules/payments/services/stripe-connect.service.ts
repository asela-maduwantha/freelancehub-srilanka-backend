import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { EmailService } from '../../../common/services/email.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeConnectService {
  private stripe: Stripe;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('stripe.secretKey') || '', {
      apiVersion: '2025-08-27.basil' as any,
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

    // Check if user already has a Stripe account
    if (user.stripeAccountId) {
      throw new BadRequestException('User already has a Stripe account');
    }

    try {
      // Create Express account
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: user.location?.country || 'US',
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

      // Update user with Stripe account ID
      user.stripeAccountId = account.id;
      user.stripeAccountStatus = 'pending';
      await user.save();

      // Create account link for onboarding
      const accountLink = await this.stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${this.configService.get('app.frontendUrl')}/freelancer/payments`,
        return_url: `${this.configService.get('app.frontendUrl')}/freelancer/payments`,
        type: 'account_onboarding',
      });

      // Send onboarding email
      await this.emailService.sendStripeConnectOnboarding(
        user.email,
        `${user.firstName} ${user.lastName}`,
        accountLink.url
      );

      return {
        accountId: account.id,
        onboardingUrl: accountLink.url,
      };
    } catch (error) {
      throw new BadRequestException('Failed to create Stripe account: ' + error.message);
    }
  }

  async getStripeAccountStatus(userId: string): Promise<{ accountId: string; status: string; details?: any }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.stripeAccountId) {
      throw new BadRequestException('User does not have a Stripe account');
    }

    try {
      const account = await this.stripe.accounts.retrieve(user.stripeAccountId);

      // Update local status
      let status = 'pending';
      if (account.details_submitted && account.charges_enabled) {
        status = 'complete';
      } else if (account.details_submitted) {
        status = 'incomplete';
      } else if (account.requirements?.disabled_reason) {
        status = 'rejected';
      }

      user.stripeAccountStatus = status;
      await user.save();

      return {
        accountId: user.stripeAccountId,
        status,
        details: {
          charges_enabled: account.charges_enabled,
          details_submitted: account.details_submitted,
          requirements: account.requirements,
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to retrieve account status: ' + error.message);
    }
  }

  async getAccountOnboardingLink(userId: string): Promise<{ url: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.stripeAccountId) {
      throw new BadRequestException('User does not have a Stripe account');
    }

    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: user.stripeAccountId,
        refresh_url: `${this.configService.get('app.frontendUrl')}/freelancer/payments`,
        return_url: `${this.configService.get('app.frontendUrl')}/freelancer/payments`,
        type: 'account_onboarding',
      });

      return { url: accountLink.url };
    } catch (error) {
      throw new BadRequestException('Failed to create onboarding link: ' + error.message);
    }
  }

  async getStripeAccountId(userId: string): Promise<string> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.stripeAccountId) {
      throw new BadRequestException('User does not have a Stripe account set up');
    }

    if (user.stripeAccountStatus !== 'complete') {
      throw new BadRequestException('Stripe account is not fully set up yet');
    }

    return user.stripeAccountId;
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
        await this.handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      case 'capability.updated':
        await this.handleCapabilityUpdated(event.data.object as Stripe.Capability);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  }

  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    // Find user by Stripe account ID
    const user = await this.userModel.findOne({ stripeAccountId: account.id });
    if (!user) {
      console.log(`User not found for Stripe account ${account.id}`);
      return;
    }

    // Update account status based on capabilities
    let status = 'pending';
    if (account.details_submitted && account.charges_enabled) {
      status = 'complete';
    } else if (account.details_submitted) {
      status = 'incomplete';
    } else if (account.requirements?.disabled_reason) {
      status = 'rejected';
    }

    user.stripeAccountStatus = status;
    await user.save();

    console.log(`Updated Stripe account status for user ${user._id}: ${status}`);
  }

  private async handleCapabilityUpdated(capability: Stripe.Capability): Promise<void> {
    // Find user by Stripe account ID
    const user = await this.userModel.findOne({ stripeAccountId: capability.account });
    if (!user) {
      console.log(`User not found for Stripe account ${capability.account}`);
      return;
    }

    // Update status if transfers capability becomes active
    if (capability.id === 'transfers' && capability.status === 'active') {
      user.stripeAccountStatus = 'complete';
      await user.save();
      console.log(`Stripe transfers capability activated for user ${user._id}`);
    }
  }
}
