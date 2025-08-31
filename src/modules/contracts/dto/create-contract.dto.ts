import { IsNotEmpty, IsNumber, IsString, IsDateString, IsEnum, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ContractTermsDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  budget: number;

  @IsNotEmpty()
  @IsEnum(['fixed', 'hourly'])
  type: 'fixed' | 'hourly';

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsNotEmpty()
  @IsString()
  paymentSchedule: string;
}

export class MilestoneDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsNotEmpty()
  @IsDateString()
  dueDate: string;
}

export class CreateContractDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsString()
  proposalId: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ContractTermsDto)
  terms: ContractTermsDto;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones: MilestoneDto[];
}
