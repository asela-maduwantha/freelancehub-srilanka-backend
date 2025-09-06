import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
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
import { CreateWithdrawalDto } from '../dto/create-withdrawal.dto';
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

  @Post('create')
  @ApiOperation({
    summary: 'Create payment for milestone release (Stripe escrow model)',
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Payment created and funds held in escrow',
    schema: {
      type: 'object',
      properties: {
        paymentId: { type: 'string', description: 'Internal payment ID' },
        message: { type: 'string', description: 'Payment creation status' },
        stripePaymentIntent: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Stripe payment intent ID' },
            clientSecret: { type: 'string', description: 'Stripe client secret for frontend' },
            amount: { type: 'number', description: 'Amount in cents' },
            currency: { type: 'string', description: 'Currency code' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid payment data',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPayment(
    @Request() req,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(req.user.userId, createPaymentDto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm payment with Stripe payment intent' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentIntentId: {
          type: 'string',
          description: 'Stripe payment intent ID',
        },
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
  async confirmPayment(
    @Param('id') paymentId: string,
    @Body('paymentIntentId') paymentIntentId: string,
    @Request() req,
  ) {
    return this.paymentsService.confirmPayment(paymentId, paymentIntentId, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get user payments with optional filtering' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by payment status',
  })
  @ApiQuery({
    name: 'escrowStatus',
    required: false,
    description: 'Filter by escrow status (held, released, refunded)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Limit number of results',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: 'number',
    description: 'Offset for pagination',
  })
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
        pendingPayments: {
          type: 'number',
          description: 'Number of pending payments',
        },
        completedPayments: {
          type: 'number',
          description: 'Number of completed payments' },
        escrowHeld: { type: 'number', description: 'Total amount held in escrow' },
        escrowReleased: { type: 'number', description: 'Total amount released from escrow' },
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
        autoRelease: { type: 'boolean', description: 'Whether auto-release is enabled' },
        autoReleaseDays: { type: 'number', description: 'Number of days for auto-release' },
        autoReleaseDate: { type: 'string', format: 'date-time', description: 'Date when payment will auto-release' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not payment participant',
  })
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not authorized to refund',
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async processRefund(
    @Request() req,
    @Param('id') paymentId: string,
    @Body('reason') reason: string,
  ) {
    return this.paymentsService.processRefund(
      paymentId,
      req.user.userId,
      reason,
    );
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
        onboardingUrl: {
          type: 'string',
          description: 'URL for Stripe onboarding',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - user not eligible or already has account',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createStripeAccount(@Request() req) {
    return this.stripeConnectService.createStripeAccount(req.user.userId);
  }

  @Get('stripe-connect/status/:accountId')
  @ApiOperation({ summary: 'Get Stripe Connect account status' })
  @ApiParam({ name: 'accountId', description: 'Stripe account ID' })
  @ApiResponse({
    status: 200,
    description: 'Account status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Stripe account ID' },
        status: {
          type: 'string',
          description:
            'Account status (pending, complete, incomplete, rejected)',
        },
        details: {
          type: 'object',
          properties: {
            chargesEnabled: { type: 'boolean' },
            detailsSubmitted: { type: 'boolean' },
            requirements: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid account ID' })
  async getStripeAccountStatus(@Param('accountId') accountId: string) {
    return this.stripeConnectService.getStripeAccountStatus(accountId);
  }

  @Get('stripe-connect/onboarding-link/:accountId')
  @ApiOperation({ summary: 'Get Stripe Connect onboarding link' })
  @ApiParam({ name: 'accountId', description: 'Stripe account ID' })
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
  @ApiResponse({ status: 400, description: 'Invalid account ID' })
  async getAccountOnboardingLink(@Param('accountId') accountId: string) {
    return this.stripeConnectService.getAccountOnboardingLink(accountId);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Process manual withdrawal for freelancer' })
  @ApiBody({ type: CreateWithdrawalDto })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal processed successfully',
    schema: {
      type: 'object',
      properties: {
        payoutId: { type: 'string', description: 'Stripe payout ID' },
        amount: { type: 'number', description: 'Withdrawal amount' },
        status: { type: 'string', description: 'Payout status' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Withdrawal failed' })
  async processWithdrawal(
    @Request() req,
    @Body() withdrawalDto: CreateWithdrawalDto,
  ) {
    const { amount, currency = 'usd' } = withdrawalDto;
    return this.stripeConnectService.processManualWithdrawal(
      req.user.userId,
      amount,
      currency,
    );
  }

  @Post('process-auto-releases')
  @ApiOperation({ summary: 'Process pending auto-releases (manual trigger for testing)' })
  @ApiResponse({
    status: 200,
    description: 'Auto-releases processed successfully',
    schema: {
      type: 'object',
      properties: {
        processed: { type: 'number', description: 'Number of payments processed' },
        errors: { type: 'array', items: { type: 'string' }, description: 'Any errors encountered' },
      },
    },
  })
  async processAutoReleases() {
    return this.paymentsService.processAutoReleases();
  }

  @Post('cleanup-stuck-payments')
  @ApiOperation({ summary: 'Clean up payments stuck in pending status (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Stuck payments cleaned up successfully',
    schema: {
      type: 'object',
      properties: {
        cleaned: { type: 'number', description: 'Number of payments cleaned up' },
        errors: { type: 'array', items: { type: 'string' }, description: 'Any errors encountered' },
      },
    },
  })
  async cleanupStuckPayments() {
    return this.paymentsService.cleanupStuckPayments();
  }

  // Stripe webhook endpoint moved to separate controller for proper auth handling
}
