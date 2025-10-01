import { IsString, IsOptional, IsBoolean, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentMethodDto {
  @ApiProperty({ description: 'Stripe payment method ID' })
  @IsString()
  paymentMethodId: string;

  @ApiPropertyOptional({ description: 'Set as default payment method', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class PaymentMethodResponseDto {
  @ApiProperty({ description: 'Payment method ID' })
  id: string;

  @ApiProperty({ description: 'Stripe payment method ID' })
  stripePaymentMethodId: string;

  @ApiProperty({ description: 'Payment method type' })
  type: 'card' | 'bank_account';

  @ApiPropertyOptional({ description: 'Card details (if type is card)' })
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };

  @ApiPropertyOptional({ description: 'Bank account details (if type is bank_account)' })
  bankAccount?: {
    bankName: string;
    last4: string;
    routingNumber: string;
  };

  @ApiProperty({ description: 'Is this the default payment method' })
  isDefault: boolean;

  @ApiProperty({ description: 'Is this payment method active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Creation timestamp' })
  createdAt?: Date;
}

export class PaymentMethodsListResponseDto {
  @ApiProperty({ description: 'List of payment methods', type: [PaymentMethodResponseDto] })
  paymentMethods: PaymentMethodResponseDto[];

  @ApiPropertyOptional({ description: 'Default payment method ID' })
  defaultPaymentMethodId?: string;
}

export class SetupIntentResponseDto {
  @ApiPropertyOptional({ description: 'Stripe client secret for setup intent' })
  clientSecret?: string | null;

  @ApiProperty({ description: 'Setup intent ID' })
  setupIntentId: string;
}