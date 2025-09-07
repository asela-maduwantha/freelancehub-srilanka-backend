import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from '../../../schemas/payment.schema';
import Stripe from 'stripe';

export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class StripeError extends PaymentError {
  constructor(
    message: string,
    public stripeError: Stripe.StripeRawError,
  ) {
    super(message, 'STRIPE_ERROR', 400);
    this.name = 'StripeError';
  }
}

@Injectable()
export class PaymentErrorHandler {
  private readonly logger = new Logger(PaymentErrorHandler.name);

  handleStripeError(error: any, context: string): never {
    this.logger.error(`Stripe error in ${context}:`, error);

    if (error.type === 'StripeCardError') {
      throw new StripeError(`Card error: ${error.message}`, error);
    }

    if (error.type === 'StripeRateLimitError') {
      throw new StripeError(
        'Too many requests to Stripe. Please try again later.',
        error,
      );
    }

    if (error.type === 'StripeInvalidRequestError') {
      throw new StripeError(`Invalid request: ${error.message}`, error);
    }

    if (error.type === 'StripeAPIError') {
      throw new StripeError('Stripe API error. Please try again.', error);
    }

    if (error.type === 'StripeConnectionError') {
      throw new StripeError(
        'Network error connecting to Stripe. Please try again.',
        error,
      );
    }

    if (error.type === 'StripeAuthenticationError') {
      throw new InternalServerErrorException(
        'Payment service configuration error',
      );
    }

    throw new StripeError(`Unexpected Stripe error: ${error.message}`, error);
  }

  handleDatabaseError(error: any, context: string): never {
    this.logger.error(`Database error in ${context}:`, error);

    if (error.name === 'ValidationError') {
      throw new BadRequestException(
        `Invalid data: ${Object.values(error.errors)
          .map((e: any) => e.message)
          .join(', ')}`,
      );
    }

    if (error.name === 'CastError') {
      throw new BadRequestException('Invalid ID format');
    }

    if (error.code === 11000) {
      throw new BadRequestException('Duplicate entry found');
    }

    throw new InternalServerErrorException(
      `Database error in ${context}. Please try again.`,
    );
  }

  handlePaymentValidationError(
    payment: PaymentDocument,
    userId: string,
    action: string,
  ): void {
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Check if user has permission
    if (
      payment.payerId.toString() !== userId &&
      payment.payeeId.toString() !== userId
    ) {
      throw new BadRequestException('Access denied to this payment');
    }

    // Validate payment state for specific actions
    switch (action) {
      case 'complete':
        if (payment.status !== 'processing') {
          throw new BadRequestException(
            `Payment cannot be completed. Current status: ${payment.status}`,
          );
        }
        if (payment.payerId.toString() !== userId) {
          throw new BadRequestException('Only the client can complete payment');
        }
        break;

      case 'refund':
        if (!['pending', 'processing', 'completed'].includes(payment.status)) {
          throw new BadRequestException(
            `Payment cannot be refunded. Current status: ${payment.status}`,
          );
        }
        if (payment.payerId.toString() !== userId) {
          throw new BadRequestException('Only the client can request refund');
        }
        break;

      case 'withdraw':
        if (payment.status !== 'completed') {
          throw new BadRequestException(
            `Payment not available for withdrawal. Current status: ${payment.status}`,
          );
        }
        if (payment.payeeId.toString() !== userId) {
          throw new BadRequestException(
            'Only the freelancer can withdraw payment',
          );
        }
        break;
    }
  }

  logPaymentEvent(
    event: string,
    paymentId: string,
    userId: string,
    details?: any,
  ): void {
    this.logger.log(
      JSON.stringify({
        event,
        paymentId,
        userId,
        timestamp: new Date().toISOString(),
        details,
      }),
    );
  }
}
