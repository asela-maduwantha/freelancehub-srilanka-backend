import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../schemas/user.schema';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  SetupPaymentMethodDto,
  CreatePaymentIntentDto,
  ConfirmPaymentDto,
} from '../dto/payment-methods.dto';

@Injectable()
export class PaymentMethodsService {
  private stripe: Stripe;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('stripe.secretKey') || '',
      {
        apiVersion: '2025-08-27.basil',
      },
    );
  }

  async setupStripeCustomer(userId: string): Promise<{ customerId: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.stripeCustomerId) {
      return { customerId: user.stripeCustomerId };
    }

    try {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: userId,
        },
      });

      await this.userModel.findByIdAndUpdate(userId, {
        stripeCustomerId: customer.id,
      });

      return { customerId: customer.id };
    } catch (error) {
      throw new BadRequestException('Failed to create Stripe customer');
    }
  }

  async addPaymentMethod(
    userId: string,
    setupPaymentMethodDto: SetupPaymentMethodDto,
  ): Promise<{ paymentMethod: any }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.stripeCustomerId) {
      await this.setupStripeCustomer(userId);
      // Re-fetch user after customer creation
      const updatedUser = await this.userModel.findById(userId);
      if (!updatedUser?.stripeCustomerId) {
        throw new BadRequestException('Failed to setup Stripe customer');
      }
    }

    try {
      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(
        setupPaymentMethodDto.paymentMethodId,
        {
          customer: user.stripeCustomerId,
        },
      );

      // Get payment method details
      const paymentMethod = await this.stripe.paymentMethods.retrieve(
        setupPaymentMethodDto.paymentMethodId,
      );

      // Update user's saved payment methods
      const savedMethod = {
        id: paymentMethod.id,
        type: paymentMethod.type,
        last4: paymentMethod.card?.last4 || '',
        brand: paymentMethod.card?.brand || '',
        expiryMonth: paymentMethod.card?.exp_month || 0,
        expiryYear: paymentMethod.card?.exp_year || 0,
        isDefault:
          setupPaymentMethodDto.setAsDefault ||
          user.savedPaymentMethods?.length === 0,
      };

      // If setting as default, unset other defaults
      if (savedMethod.isDefault) {
        await this.userModel.findByIdAndUpdate(userId, {
          $unset: { 'savedPaymentMethods.$[].isDefault': false },
        });
      }

      await this.userModel.findByIdAndUpdate(userId, {
        $push: { savedPaymentMethods: savedMethod },
      });

      return { paymentMethod: savedMethod };
    } catch (error) {
      throw new BadRequestException('Failed to add payment method');
    }
  }

  async getSavedPaymentMethods(userId: string): Promise<any[]> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.savedPaymentMethods || [];
  }

  async removePaymentMethod(
    userId: string,
    paymentMethodId: string,
  ): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // Detach from Stripe
      await this.stripe.paymentMethods.detach(paymentMethodId);

      // Remove from user's saved methods
      await this.userModel.findByIdAndUpdate(userId, {
        $pull: { savedPaymentMethods: { id: paymentMethodId } },
      });
    } catch (error) {
      throw new BadRequestException('Failed to remove payment method');
    }
  }

  async setDefaultPaymentMethod(
    userId: string,
    paymentMethodId: string,
  ): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if payment method exists
    const paymentMethod = user.savedPaymentMethods?.find(
      (pm) => pm.id === paymentMethodId,
    );
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    // Update all payment methods to not be default, then set this one as default
    await this.userModel.findByIdAndUpdate(
      userId,
      {
        $unset: { 'savedPaymentMethods.$[].isDefault': false },
        $set: { 'savedPaymentMethods.$[elem].isDefault': true },
      },
      {
        arrayFilters: [{ 'elem.id': paymentMethodId }],
      },
    );
  }

  async createPaymentIntent(
    userId: string,
    createPaymentIntentDto: CreatePaymentIntentDto,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.stripeCustomerId) {
      throw new BadRequestException('Stripe customer not setup');
    }

    try {
      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(parseFloat(createPaymentIntentDto.amount) * 100),
        currency: createPaymentIntentDto.currency,
        customer: user.stripeCustomerId,
        description: createPaymentIntentDto.description,
        setup_future_usage: 'off_session', // Allow future payments
      };

      if (createPaymentIntentDto.paymentMethodId) {
        paymentIntentData.payment_method =
          createPaymentIntentDto.paymentMethodId;
      }

      const paymentIntent =
        await this.stripe.paymentIntents.create(paymentIntentData);

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  async confirmPayment(
    userId: string,
    confirmPaymentDto: ConfirmPaymentDto,
  ): Promise<{ status: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(
        confirmPaymentDto.paymentIntentId,
        {
          payment_method: confirmPaymentDto.paymentMethodId,
        },
      );

      return { status: paymentIntent.status };
    } catch (error) {
      throw new BadRequestException('Failed to confirm payment');
    }
  }
}
