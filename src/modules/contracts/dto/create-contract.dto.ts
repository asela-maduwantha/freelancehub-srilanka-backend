import {
  IsString,
  IsOptional,
  IsDate,
  IsMongoId,
  IsNotEmpty,
  MinDate,
  IsArray,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Milestone DTO for contract creation
export class CreateContractMilestoneDto {
  @ApiProperty({ description: 'Milestone title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Milestone description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Milestone amount', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Duration in days for milestone completion' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationDays?: number;

  @ApiProperty({ description: 'Milestone order within the contract', minimum: 1 })
  @IsNumber()
  @Min(1)
  order: number;
}

// Create Contract DTO
export class CreateContractDto {
  @ApiProperty({ description: 'Proposal ID to create contract from' })
  @IsMongoId()
  @IsNotEmpty()
  proposalId: string;

  @ApiProperty({ description: 'Contract start date', type: Date })
  @IsDate()
  @Type(() => Date)
  @Transform(({ value }) => {
    const date = new Date(value);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    if (date < tomorrow) {
      throw new Error('Start date must be at least tomorrow');
    }
    return date;
  })
  startDate: Date;

  @ApiProperty({ description: 'Contract end date', type: Date })
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @ApiPropertyOptional({ description: 'Contract terms and conditions' })
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiPropertyOptional({
    description: 'Milestones for the contract',
    type: [CreateContractMilestoneDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContractMilestoneDto)
  milestones?: CreateContractMilestoneDto[];

  @ApiProperty({ description: 'Saved payment method ID to use for upfront contract payment' })
  @IsMongoId()
  paymentMethodId: string;

  @ApiPropertyOptional({ description: 'Whether to save the payment method for future use', default: false })
  @IsOptional()
  savePaymentMethod?: boolean;
}
