import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
  metadata?: { [key: string]: string };
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export interface RefundResult {
  id: string;
  amount: number;
  status: string;
  paymentIntentId: string;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    this.initializeStripe();
  }

  private initializeStripe(): void {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    const apiVersion = this.configService.get<string>('stripe.apiVersion') || '2023-10-16';

    if (!secretKey) {
      throw new Error('Stripe secret key is required.');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: apiVersion as Stripe.LatestApiVersion,
    });

    this.logger.log('Stripe service initialized successfully');
  }

  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    metadata?: { [key: string]: string },
    paymentMethodId?: string,
    customerId?: string
  ): Promise<PaymentIntent> {
    try {
      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: metadata || {},
      };

      if (paymentMethodId) {
        // If payment method is provided, attach it and set confirmation method
        paymentIntentData.payment_method = paymentMethodId;
        paymentIntentData.confirm = true;
        paymentIntentData.return_url = process.env.FRONTEND_URL || 'http://localhost:3000';

        // If customer is provided, include it (required when payment method belongs to a customer)
        if (customerId) {
          paymentIntentData.customer = customerId;
        }
      } else {
        // Use automatic payment methods if no specific payment method
        paymentIntentData.automatic_payment_methods = {
          enabled: true,
        };
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);

      this.logger.log(`Payment intent created: ${paymentIntent.id}`);

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret as string,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      this.logger.error('Failed to create payment intent:', error);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);

      this.logger.log(`Payment intent confirmed: ${paymentIntentId}`);

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret as string,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to confirm payment intent ${paymentIntentId}:`, error);
      throw new Error(`Failed to confirm payment intent: ${error.message}`);
    }
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);

      this.logger.log(`Payment intent cancelled: ${paymentIntentId}`);

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret as string,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to cancel payment intent ${paymentIntentId}:`, error);
      throw new Error(`Failed to cancel payment intent: ${error.message}`);
    }
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret as string,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve payment intent ${paymentIntentId}:`, error);
      throw new Error(`Failed to retrieve payment intent: ${error.message}`);
    }
  }

  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<RefundResult> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: reason as Stripe.RefundCreateParams.Reason,
      });

      this.logger.log(`Refund created: ${refund.id} for payment intent: ${paymentIntentId}`);

      return {
        id: refund.id,
        amount: refund.amount,
        status: refund.status || 'unknown',
        paymentIntentId: paymentIntentId,
      };
    } catch (error) {
      this.logger.error(`Failed to create refund for payment intent ${paymentIntentId}:`, error);
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  }

  async listPaymentMethods(customerId?: string): Promise<PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        } : undefined,
      }));
    } catch (error) {
      this.logger.error('Failed to list payment methods:', error);
      throw new Error(`Failed to list payment methods: ${error.message}`);
    }
  }

  async createCustomer(email: string, name?: string, metadata?: { [key: string]: string }): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: metadata || {},
      });

      this.logger.log(`Customer created: ${customer.id}`);

      return customer;
    } catch (error) {
      this.logger.error('Failed to create customer:', error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  async retrieveCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer as Stripe.Customer;
    } catch (error) {
      this.logger.error(`Failed to retrieve customer ${customerId}:`, error);
      throw new Error(`Failed to retrieve customer: ${error.message}`);
    }
  }

  async updateCustomer(
    customerId: string,
    updates: { email?: string; name?: string; metadata?: { [key: string]: string } }
  ): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.update(customerId, updates);
      this.logger.log(`Customer updated: ${customerId}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to update customer ${customerId}:`, error);
      throw new Error(`Failed to update customer: ${error.message}`);
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      await this.stripe.customers.del(customerId);
      this.logger.log(`Customer deleted: ${customerId}`);
    } catch (error) {
      this.logger.error(`Failed to delete customer ${customerId}:`, error);
      throw new Error(`Failed to delete customer: ${error.message}`);
    }
  }

  async createWebhookEndpoint(
    url: string,
    events: string[],
    secret?: string
  ): Promise<Stripe.WebhookEndpoint> {
    try {
      const webhookEndpoint = await this.stripe.webhookEndpoints.create({
        url,
        enabled_events: events as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
        api_version: this.configService.get<string>('stripe.apiVersion') as Stripe.LatestApiVersion || '2023-10-16',
      });

      this.logger.log(`Webhook endpoint created: ${webhookEndpoint.id}`);

      return webhookEndpoint;
    } catch (error) {
      this.logger.error('Failed to create webhook endpoint:', error);
      throw new Error(`Failed to create webhook endpoint: ${error.message}`);
    }
  }

  constructEvent(payload: string | Buffer, signature: string, secret: string): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      this.logger.error('Failed to construct webhook event:', error);
      throw new Error(`Failed to construct webhook event: ${error.message}`);
    }
  }

  async getBalance(): Promise<Stripe.Balance> {
    try {
      const balance = await this.stripe.balance.retrieve();
      return balance;
    } catch (error) {
      this.logger.error('Failed to retrieve balance:', error);
      throw new Error(`Failed to retrieve balance: ${error.message}`);
    }
  }

  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      });
      return setupIntent;
    } catch (error) {
      this.logger.error('Failed to create setup intent:', error);
      throw new Error(`Failed to create setup intent: ${error.message}`);
    }
  }

  async getPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
      return paymentMethod;
    } catch (error) {
      this.logger.error('Failed to retrieve payment method:', error);
      throw new Error(`Failed to retrieve payment method: ${error.message}`);
    }
  }

  async detachPaymentMethodFromCustomer(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
      return paymentMethod;
    } catch (error) {
      this.logger.error('Failed to detach payment method:', error);
      throw new Error(`Failed to detach payment method: ${error.message}`);
    }
  }

  // Connected Accounts Management
  async createConnectedAccount(
    email: string,
    country: string,
    type: 'express' | 'standard' = 'express',
    metadata?: { [key: string]: string }
  ): Promise<Stripe.Account> {
    try {
      const account = await this.stripe.accounts.create({
        type,
        country,
        email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: metadata || {},
      });

      this.logger.log(`Connected account created: ${account.id} for email: ${email}`);
      return account;
    } catch (error) {
      this.logger.error('Failed to create connected account:', error);
      throw new Error(`Failed to create connected account: ${error.message}`);
    }
  }

  async createAccountLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string,
    type: 'account_onboarding' | 'account_update' = 'account_onboarding'
  ): Promise<Stripe.AccountLink> {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type,
      });

      this.logger.log(`Account link created for account: ${accountId}`);
      return accountLink;
    } catch (error) {
      this.logger.error(`Failed to create account link for ${accountId}:`, error);
      throw new Error(`Failed to create account link: ${error.message}`);
    }
  }

  async retrieveAccount(accountId: string): Promise<Stripe.Account> {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);
      return account;
    } catch (error) {
      this.logger.error(`Failed to retrieve account ${accountId}:`, error);
      throw new Error(`Failed to retrieve account: ${error.message}`);
    }
  }

  async updateAccount(
    accountId: string,
    updates: Stripe.AccountUpdateParams
  ): Promise<Stripe.Account> {
    try {
      const account = await this.stripe.accounts.update(accountId, updates);
      this.logger.log(`Account updated: ${accountId}`);
      return account;
    } catch (error) {
      this.logger.error(`Failed to update account ${accountId}:`, error);
      throw new Error(`Failed to update account: ${error.message}`);
    }
  }

  async deleteAccount(accountId: string): Promise<Stripe.DeletedAccount> {
    try {
      const deleted = await this.stripe.accounts.del(accountId);
      this.logger.log(`Account deleted: ${accountId}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete account ${accountId}:`, error);
      throw new Error(`Failed to delete account: ${error.message}`);
    }
  }

  // Transfers and Payouts
  async createTransfer(
    amount: number,
    destination: string,
    currency: string = 'usd',
    metadata?: { [key: string]: string }
  ): Promise<Stripe.Transfer> {
    try {
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        destination,
        metadata: metadata || {},
      });

      this.logger.log(`Transfer created: ${transfer.id} to ${destination} for ${amount} ${currency}`);
      return transfer;
    } catch (error) {
      this.logger.error(`Failed to create transfer to ${destination}:`, error);
      throw new Error(`Failed to create transfer: ${error.message}`);
    }
  }

  async retrieveTransfer(transferId: string): Promise<Stripe.Transfer> {
    try {
      const transfer = await this.stripe.transfers.retrieve(transferId);
      return transfer;
    } catch (error) {
      this.logger.error(`Failed to retrieve transfer ${transferId}:`, error);
      throw new Error(`Failed to retrieve transfer: ${error.message}`);
    }
  }

  async createPayout(
    amount: number,
    currency: string = 'usd',
    metadata?: { [key: string]: string },
    destination?: string
  ): Promise<Stripe.Payout> {
    try {
      const payoutData: Stripe.PayoutCreateParams = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: metadata || {},
      };

      if (destination) {
        payoutData.destination = destination;
      }

      const payout = await this.stripe.payouts.create(payoutData);

      this.logger.log(`Payout created: ${payout.id} for ${amount} ${currency}`);
      return payout;
    } catch (error) {
      this.logger.error('Failed to create payout:', error);
      throw new Error(`Failed to create payout: ${error.message}`);
    }
  }

  async retrievePayout(payoutId: string): Promise<Stripe.Payout> {
    try {
      const payout = await this.stripe.payouts.retrieve(payoutId);
      return payout;
    } catch (error) {
      this.logger.error(`Failed to retrieve payout ${payoutId}:`, error);
      throw new Error(`Failed to retrieve payout: ${error.message}`);
    }
  }

  async listAccountBalances(accountId: string): Promise<Stripe.Balance> {
    try {
      const balance = await this.stripe.balance.retrieve({
        stripeAccount: accountId,
      });
      return balance;
    } catch (error) {
      this.logger.error(`Failed to retrieve balance for account ${accountId}:`, error);
      throw new Error(`Failed to retrieve account balance: ${error.message}`);
    }
  }
}
