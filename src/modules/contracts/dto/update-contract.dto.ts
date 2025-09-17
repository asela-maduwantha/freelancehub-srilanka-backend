import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  platformFeePercentage?: number;

  @IsOptional()
  @IsString()
  terms?: string;
}
