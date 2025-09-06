import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsString()
  payeeId: string; // Freelancer ID

  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(['stripe', 'paypal', 'bank_transfer'])
  paymentMethod?: string;

  @IsOptional()
  @IsEnum(['project_payment', 'milestone_payment', 'bonus'])
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  milestoneId?: string;

  @IsOptional()
  @IsBoolean()
  autoRelease?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.001) // Allow fractional days for testing (e.g., 0.0035 = 5 minutes)
  autoReleaseDays?: number;
}
