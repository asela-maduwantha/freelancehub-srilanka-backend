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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentMethodsService } from '../services/payment-methods.service';
import { SetupPaymentMethodDto, CreatePaymentIntentDto, ConfirmPaymentDto } from '../dto/payment-methods.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('payment-methods')
@ApiBearerAuth('JWT-auth')
@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

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

  @Post('confirm-payment')
  @ApiOperation({ summary: 'Confirm payment' })
  @ApiResponse({
    status: 200,
    description: 'Payment confirmed successfully',
  })
  async confirmPayment(
    @Request() req,
    @Body() confirmPaymentDto: ConfirmPaymentDto,
  ) {
    return this.paymentMethodsService.confirmPayment(
      req.user.userId,
      confirmPaymentDto,
    );
  }
}
