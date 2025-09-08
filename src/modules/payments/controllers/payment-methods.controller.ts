import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentMethodsService } from '../services/payment-methods.service';
import {
  SetupPaymentMethodDto,
  CreatePaymentIntentDto,
  ConfirmPaymentDto,
} from '../dto/payment-methods.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StripeConnectService } from '../services/stripe-connect.service';
import { User, UserDocument } from '../../../schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@ApiTags('payment-methods')
@ApiBearerAuth('JWT-auth')
@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly stripeConnectService: StripeConnectService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  @Post('setup-customer')
  @ApiOperation({ summary: 'Setup Stripe customer for user' })
  @ApiResponse({
    status: 201,
    description: 'Stripe customer created successfully',
    schema: {
      type: 'object',
      properties: {
        customerId: { type: 'string' },
      },
    },
  })
  async setupCustomer(@Request() req) {
    return this.paymentMethodsService.setupStripeCustomer(req.user.userId);
  }

  @Post('create-connected-account')
  @ApiOperation({ summary: 'Create Stripe connected account for freelancer' })
  @ApiResponse({
    status: 201,
    description: 'Stripe connected account created successfully',
    schema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Stripe account ID' },
        onboardingUrl: {
          type: 'string',
          description: 'URL for Stripe onboarding',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - user is not a freelancer or account creation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async createConnectedAccount(@Request() req) {
    return this.stripeConnectService.createStripeAccount(req.user.userId);
  }

  @Get('connected-account-status/:accountId')
  @ApiOperation({ summary: 'Get Stripe connected account status' })
  @ApiResponse({
    status: 200,
    description: 'Account status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'complete', 'error'] },
        details: {
          type: 'object',
          properties: {
            detailsSubmitted: { type: 'boolean' },
            chargesEnabled: { type: 'boolean' },
            payoutsEnabled: { type: 'boolean' },
            requirements: { type: 'object' },
          },
        },
      },
    },
  })
  async getConnectedAccountStatus(@Param('accountId') accountId: string) {
    return this.stripeConnectService.getStripeAccountStatus(accountId);
  }

  @Post('connected-account-onboarding/:accountId')
  @ApiOperation({
    summary: 'Create onboarding link for Stripe connected account',
  })
  @ApiResponse({
    status: 201,
    description: 'Onboarding link created successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Stripe onboarding URL' },
      },
    },
  })
  async createAccountOnboardingLink(@Param('accountId') accountId: string) {
    return this.stripeConnectService.getAccountOnboardingLink(accountId);
  }

  @Post('add')
  @ApiOperation({ summary: 'Add payment method to user' })
  @ApiResponse({
    status: 201,
    description: 'Payment method added successfully',
  })
  async addPaymentMethod(
    @Request() req,
    @Body() setupPaymentMethodDto: SetupPaymentMethodDto,
  ) {
    return this.paymentMethodsService.addPaymentMethod(
      req.user.userId,
      setupPaymentMethodDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get user saved payment methods' })
  @ApiResponse({
    status: 200,
    description: 'Payment methods retrieved successfully',
  })
  async getSavedPaymentMethods(@Request() req) {
    return this.paymentMethodsService.getSavedPaymentMethods(req.user.userId);
  }

  @Delete(':paymentMethodId')
  @ApiOperation({ summary: 'Remove payment method' })
  @ApiResponse({
    status: 200,
    description: 'Payment method removed successfully',
  })
  async removePaymentMethod(
    @Request() req,
    @Param('paymentMethodId') paymentMethodId: string,
  ) {
    await this.paymentMethodsService.removePaymentMethod(
      req.user.userId,
      paymentMethodId,
    );
    return { message: 'Payment method removed successfully' };
  }

  @Put(':paymentMethodId/default')
  @ApiOperation({ summary: 'Set payment method as default' })
  @ApiResponse({
    status: 200,
    description: 'Payment method set as default successfully',
  })
  async setDefaultPaymentMethod(
    @Request() req,
    @Param('paymentMethodId') paymentMethodId: string,
  ) {
    await this.paymentMethodsService.setDefaultPaymentMethod(
      req.user.userId,
      paymentMethodId,
    );
    return { message: 'Payment method set as default successfully' };
  }

  @Post('create-payment-intent')
  @ApiOperation({ summary: 'Create payment intent for milestone payment' })
  @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
  })
  async createPaymentIntent(
    @Request() req,
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
  ) {
    return this.paymentMethodsService.createPaymentIntent(
      req.user.userId,
      createPaymentIntentDto,
    );
  }

  @Get('debug-stripe')
  @ApiOperation({ summary: 'Debug Stripe configuration' })
  @ApiResponse({
    status: 200,
    description: 'Stripe configuration status',
  })
  async debugStripe(@Request() req) {
    const user = await this.userModel.findById(req.user.userId);
    
    return {
      userId: req.user.userId,
      hasStripeCustomer: !!user?.stripeCustomerId,
      stripeCustomerId: user?.stripeCustomerId,
      savedPaymentMethodsCount: user?.savedPaymentMethods?.length || 0,
      savedPaymentMethods: user?.savedPaymentMethods?.map(pm => ({
        id: pm.id,
        type: pm.type,
        last4: pm.last4,
        brand: pm.brand,
        isDefault: pm.isDefault
      })) || [],
      stripeSecretConfigured: !!process.env.STRIPE_SECRET_KEY,
      stripeSecretPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 10) + '...',
    };
  }
}
