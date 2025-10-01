import { IsString, IsOptional, IsNumber } from 'class-validator';

export class ProcessWithdrawalDto {
  @IsString()
  @IsOptional()
  stripeTransferId?: string;

  @IsString()
  @IsOptional()
  stripePayoutId?: string;

  @IsNumber()
  @IsOptional()
  processingFee?: number;

  @IsString()
  @IsOptional()
  externalTransactionId?: string;
}