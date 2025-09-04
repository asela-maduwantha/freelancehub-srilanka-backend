import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  IsIn,
  ValidateNested,
  IsDate,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AttachmentDto {
  @ApiProperty()
  @IsString()
  filename: string;

  @ApiProperty()
  @IsString()
  url: string;
}

class MilestoneDto {
  @ApiProperty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiProperty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deadline?: Date;

  @ApiPropertyOptional({ type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  deliverables?: AttachmentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class CreateContractDto {
  @ApiProperty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiProperty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  totalAmount: number;

  @ApiProperty({ enum: ['USD', 'EUR', 'LKR'] })
  @IsIn(['USD', 'EUR', 'LKR'])
  currency: string;

  @ApiProperty({ enum: ['fixed_price', 'hourly'] })
  @IsIn(['fixed_price', 'hourly'])
  contractType: string;

  @ApiProperty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  terms: string;

  @ApiProperty({ type: [MilestoneDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones: MilestoneDto[];

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}

export class UpdateContractDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  terms?: string;

  @ApiPropertyOptional({ type: [MilestoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones?: MilestoneDto[];

  @ApiPropertyOptional({
    enum: ['active', 'completed', 'cancelled', 'disputed'],
  })
  @IsOptional()
  @IsIn(['active', 'completed', 'cancelled', 'disputed'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}

export class UpdateMilestoneDto {
  @ApiPropertyOptional({
    enum: ['pending', 'in_progress', 'submitted', 'approved', 'rejected'],
  })
  @IsOptional()
  @IsIn(['pending', 'in_progress', 'submitted', 'approved', 'rejected'])
  status?: string;

  @ApiPropertyOptional({ type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  deliverables?: AttachmentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class ContractResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  proposalId: string;

  @ApiProperty()
  clientId: string;

  @ApiProperty()
  freelancerId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  contractType: string;

  @ApiProperty()
  terms: string;

  @ApiProperty({ type: [MilestoneDto] })
  milestones: MilestoneDto[];

  @ApiProperty()
  status: string;

  @ApiProperty()
  startDate: Date;

  @ApiPropertyOptional()
  endDate?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
