import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, IsEnum } from 'class-validator';
import { Types } from 'mongoose';

export enum WithdrawalMethod {
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
}

export class CreateWithdrawalDto {
  @IsNotEmpty()
  userId: Types.ObjectId;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @IsEnum(WithdrawalMethod)
  method: WithdrawalMethod;

  // Bank transfer details
  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @IsString()
  @IsOptional()
  bankRoutingNumber?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  accountHolderName?: string;

  // PayPal details
  @IsString()
  @IsOptional()
  paypalEmail?: string;

  // Stripe details
  @IsString()
  @IsOptional()
  stripeAccountId?: string;

  @IsString()
  @IsOptional()
  description?: string;
}