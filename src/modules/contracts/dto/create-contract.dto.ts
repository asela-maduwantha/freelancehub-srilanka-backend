import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ContractTermsDto {
  @ApiProperty({
    description: 'The budget for the contract',
    type: 'number',
    example: 1000,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  budget: number;

  @ApiProperty({
    description: 'The type of contract',
    enum: ['fixed', 'hourly'],
    example: 'fixed',
  })
  @IsNotEmpty()
  @IsEnum(['fixed', 'hourly'])
  type: 'fixed' | 'hourly';

  @ApiProperty({
    description: 'The start date of the contract',
    format: 'date',
    example: '2023-01-01',
  })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'The end date of the contract',
    format: 'date',
    example: '2023-12-31',
  })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'The payment schedule for the contract',
    example: 'Monthly',
  })
  @IsNotEmpty()
  @IsString()
  paymentSchedule: string;
}

export class MilestoneDto {
  @ApiProperty({
    description: 'The title of the milestone',
    example: 'Initial Development',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'The description of the milestone',
    example: 'Complete the initial setup and development',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'The amount for the milestone',
    type: 'number',
    example: 500,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'The due date for the milestone',
    format: 'date',
    example: '2023-06-01',
  })
  @IsNotEmpty()
  @IsDateString()
  dueDate: string;
}

export class CreateContractDto {
  @ApiProperty({ description: 'The ID of the project', example: 'proj123' })
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'The ID of the proposal', example: 'prop456' })
  @IsNotEmpty()
  @IsString()
  proposalId: string;

  @ApiProperty({
    description: 'The terms of the contract',
    type: () => ContractTermsDto,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ContractTermsDto)
  terms: ContractTermsDto;

  @ApiProperty({ description: 'The list of milestones', type: [MilestoneDto] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones: MilestoneDto[];
}
