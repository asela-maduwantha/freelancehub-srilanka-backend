import { IsNumber, IsString, IsOptional, IsMongoId, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiPropertyOptional({ description: 'Contract ID if this payment is for a contract' })
  @IsOptional()
  @IsMongoId()
  contractId?: string;

  @ApiProperty({ description: 'Payment amount in the smallest currency unit (e.g., cents for USD)' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code (default: USD)', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Optional description for the payment' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Stripe payment method ID to use for this payment intent' })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({ description: 'Metadata for the payment intent' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class PaymentIntentResponseDto {
  @ApiProperty({ description: 'Stripe payment intent ID' })
  id: string;

  @ApiProperty({ description: 'Stripe client secret for frontend payment confirmation' })
  clientSecret: string;

  @ApiProperty({ description: 'Payment amount' })
  amount: number;

  @ApiProperty({ description: 'Payment currency' })
  currency: string;

  @ApiProperty({ description: 'Payment intent status' })
  status: string;

  @ApiPropertyOptional({ description: 'Payment metadata' })
  metadata?: Record<string, any>;
}