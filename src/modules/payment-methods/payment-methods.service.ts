import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaymentMethod, PaymentMethodDocument } from '../../database/schemas/payment-method.schema';
import { User } from '../../database/schemas/user.schema';
import { StripeService } from '../../services/stripe/stripe.service';
import { UsersService } from '../users/users.service';
import { CreatePaymentMethodDto, PaymentMethodResponseDto, PaymentMethodsListResponseDto } from './dto/payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectModel(PaymentMethod.name) private paymentMethodModel: Model<PaymentMethodDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly stripeService: StripeService,
    private readonly usersService: UsersService,
  ) {}

  async createSetupIntent(userId: string) {
    // Ensure user has Stripe customer
    const customer = await this.ensureStripeCustomer(userId);

    // Create setup intent
    const setupIntent = await this.stripeService.createSetupIntent(customer.id);

    return {
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    };
  }

  async save(userId: string, createDto: CreatePaymentMethodDto): Promise<PaymentMethodResponseDto> {
    // Get payment method details from Stripe
    const stripePaymentMethod = await this.stripeService.getPaymentMethod(createDto.paymentMethodId);

    // Create payment method record
    const paymentMethod = new this.paymentMethodModel({
      userId: new Types.ObjectId(userId),
      stripePaymentMethodId: createDto.paymentMethodId,
      type: stripePaymentMethod.type,
      card: stripePaymentMethod.type === 'card' ? {
        brand: stripePaymentMethod.card?.brand,
        last4: stripePaymentMethod.card?.last4,
        expMonth: stripePaymentMethod.card?.exp_month,
        expYear: stripePaymentMethod.card?.exp_year,
      } : undefined,
      isDefault: createDto.isDefault || false,
      isActive: true,
    });

    const saved = await paymentMethod.save();

    // If set as default, update other payment methods
    if (createDto.isDefault) {
      await this.setDefault(userId, (saved._id as Types.ObjectId).toString());
    }

    return this.mapToResponseDto(saved);
  }

  async findByUserId(userId: string): Promise<PaymentMethodsListResponseDto> {
    const paymentMethods = await this.paymentMethodModel
      .find({ userId: new Types.ObjectId(userId), isActive: true })
      .sort({ isDefault: -1, createdAt: -1 })
      .exec();

    const defaultMethod = paymentMethods.find(pm => pm.isDefault);

    return {
      paymentMethods: paymentMethods.map(pm => this.mapToResponseDto(pm)),
      defaultPaymentMethodId: defaultMethod ? (defaultMethod._id as Types.ObjectId).toString() : undefined,
    };
  }

  async findById(id: string): Promise<PaymentMethodDocument> {
    const paymentMethod = await this.paymentMethodModel.findById(id).exec();
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }
    return paymentMethod;
  }

  async setDefault(userId: string, paymentMethodId: string): Promise<void> {
    // Remove default from all user's payment methods
    await this.paymentMethodModel.updateMany(
      { userId: new Types.ObjectId(userId) },
      { isDefault: false }
    );

    // Set this one as default
    await this.paymentMethodModel.findByIdAndUpdate(
      paymentMethodId,
      { isDefault: true }
    );
  }

  async delete(userId: string, paymentMethodId: string): Promise<void> {
    const paymentMethod = await this.findById(paymentMethodId);

    // Ensure user owns this payment method
    if (paymentMethod.userId.toString() !== userId) {
      throw new BadRequestException('Payment method not found');
    }

    // Detach from Stripe
    await this.stripeService.detachPaymentMethodFromCustomer(paymentMethod.stripePaymentMethodId);

    // Mark as inactive (soft delete)
    await this.paymentMethodModel.findByIdAndUpdate(paymentMethodId, {
      isActive: false,
      isDefault: false
    });
  }

  private async ensureStripeCustomer(userId: string) {
    // Find the user
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If user already has a Stripe customer ID, return it
    if (user.stripeCustomerId) {
      return { id: user.stripeCustomerId };
    }

    // Create new Stripe customer
    const customer = await this.stripeService.createCustomer(
      user.email,
      user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.email,
      { userId: userId }
    );

    // Update user with Stripe customer ID
    await this.userModel.findByIdAndUpdate(userId, {
      stripeCustomerId: customer.id
    });

    return customer;
  }

  private mapToResponseDto(paymentMethod: PaymentMethodDocument): PaymentMethodResponseDto {
    return {
      id: (paymentMethod._id as Types.ObjectId).toString(),
      stripePaymentMethodId: paymentMethod.stripePaymentMethodId,
      type: paymentMethod.type,
      card: paymentMethod.card,
      bankAccount: paymentMethod.bankAccount,
      isDefault: paymentMethod.isDefault,
      isActive: paymentMethod.isActive,
      createdAt: paymentMethod.createdAt,
    };
  }
}