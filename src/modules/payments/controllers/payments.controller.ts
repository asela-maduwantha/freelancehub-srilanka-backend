import { Controller, Post, Get, Body, Param, Query, UseGuards, Request, Headers, RawBodyRequest } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { PaymentsService } from '../services/payments.service';
import { StripeConnectService } from '../services/stripe-connect.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripeConnectService: StripeConnectService,
  ) {}

  @Post('create-intent')
  @ApiOperation({ summary: 'Create Stripe payment intent' })
  @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
    schema: {
      type: 'object',
      properties: {
        clientSecret: { type: 'string', description: 'Stripe client secret for payment confirmation' },
        paymentId: { type: 'string', description: 'Internal payment ID' },
        amount: { type: 'number', description: 'Payment amount in cents' },
        currency: { type: 'string', example: 'usd' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid payment data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPaymentIntent(@Request() req, @Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.createPaymentIntent(req.user.userId, createPaymentDto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm payment with Stripe payment intent' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentIntentId: { type: 'string', description: 'Stripe payment intent ID' },
      },
      required: ['paymentIntentId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Payment confirmed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Payment confirmed successfully' },
        payment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string', example: 'completed' },
            amount: { type: 'number' },
            currency: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Payment confirmation failed' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async confirmPayment(@Param('id') paymentId: string, @Body('paymentIntentId') paymentIntentId: string) {
    return this.paymentsService.confirmPayment(paymentId, paymentIntentId);
  }

  @Get()
  @ApiOperation({ summary: 'Get user payments with optional filtering' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by payment status' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Limit number of results' })
  @ApiQuery({ name: 'offset', required: false, type: 'number', description: 'Offset for pagination' })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          status: { type: 'string' },
          description: { type: 'string' },
          contract: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getPayments(@Request() req, @Query() query: any) {
    return this.paymentsService.getPayments(req.user.userId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get payment statistics for current user' })
  @ApiResponse({
    status: 200,
    description: 'Payment statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalPaid: { type: 'number', description: 'Total amount paid' },
        totalReceived: { type: 'number', description: 'Total amount received' },
        pendingPayments: { type: 'number', description: 'Number of pending payments' },
        completedPayments: { type: 'number', description: 'Number of completed payments' },
        currency: { type: 'string', example: 'usd' },
      },
    },
  })
  async getPaymentStats(@Request() req) {
    return this.paymentsService.getPaymentStats(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment details by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        status: { type: 'string' },
        description: { type: 'string' },
        stripePaymentIntentId: { type: 'string' },
        contract: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            budget: { type: 'number' },
          },
        },
        payer: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
        payee: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        completedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not payment participant' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentById(@Request() req, @Param('id') paymentId: string) {
    return this.paymentsService.getPaymentById(paymentId, req.user.userId);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Process refund for payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Reason for refund' },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Refund processed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Refund processed successfully' },
        refund: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            amount: { type: 'number' },
            status: { type: 'string' },
            reason: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Refund processing failed' })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized to refund' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async processRefund(@Request() req, @Param('id') paymentId: string, @Body('reason') reason: string) {
    return this.paymentsService.processRefund(paymentId, req.user.userId, reason);
  }

  // Stripe Connect endpoints
  @Post('stripe-connect/create')
  @ApiOperation({ summary: 'Create Stripe Connect account for freelancer' })
  @ApiResponse({
    status: 201,
    description: 'Stripe account created successfully',
    schema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Stripe account ID' },
        onboardingUrl: { type: 'string', description: 'URL for Stripe onboarding' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - user not eligible or already has account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createStripeAccount(@Request() req) {
    return this.stripeConnectService.createStripeAccount(req.user.userId);
  }

  @Get('stripe-connect/status')
  @ApiOperation({ summary: 'Get Stripe Connect account status' })
  @ApiResponse({
    status: 200,
    description: 'Account status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Stripe account ID' },
        status: { type: 'string', description: 'Account status (pending, complete, incomplete, rejected)' },
        details: {
          type: 'object',
          properties: {
            charges_enabled: { type: 'boolean' },
            details_submitted: { type: 'boolean' },
            requirements: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'User does not have a Stripe account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getStripeAccountStatus(@Request() req) {
    return this.stripeConnectService.getStripeAccountStatus(req.user.userId);
  }

  @Get('stripe-connect/onboarding-link')
  @ApiOperation({ summary: 'Get Stripe Connect onboarding link' })
  @ApiResponse({
    status: 200,
    description: 'Onboarding link generated successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Stripe onboarding URL' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'User does not have a Stripe account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getAccountOnboardingLink(@Request() req) {
    return this.stripeConnectService.getAccountOnboardingLink(req.user.userId);
  }

  // Stripe webhook endpoint (no auth required)
  @Post('stripe/webhook')
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Body() rawBody: Buffer,
  ) {
    return this.stripeConnectService.handleStripeWebhook(signature, rawBody);
  }
}
