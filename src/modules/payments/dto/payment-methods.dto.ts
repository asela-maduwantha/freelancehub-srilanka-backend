import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class SetupPaymentMethodDto {
  @IsString()
  paymentMethodId: string;

  @IsBoolean()
  @IsOptional()
  setAsDefault?: boolean;
}

export class CreatePaymentIntentDto {
  @IsString()
  amount: string;

  @IsString()
  currency: string;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class ConfirmPaymentDto {
  @IsString()
  paymentIntentId: string;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;
}
