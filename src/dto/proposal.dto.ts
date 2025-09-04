import { 
  IsString, 
  IsArray, 
  IsNumber, 
  IsOptional, 
  IsIn, 
  ValidateNested, 
  IsDate,
  Min
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ProposedBudgetDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ enum: ['USD', 'EUR', 'LKR'] })
  @IsIn(['USD', 'EUR', 'LKR'])
  currency: string;

  @ApiProperty({ enum: ['fixed_price', 'hourly'] })
  @IsIn(['fixed_price', 'hourly'])
  type: string;
}

class TimelineDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  estimatedDuration: number;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  proposedDeadline: Date;
}

class AttachmentDto {
  @ApiProperty()
  @IsString()
  filename: string;

  @ApiProperty()
  @IsString()
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
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

  @ApiProperty()
  @IsNumber()
  @Min(1)
  durationDays: number;
}

export class CreateProposalDto {
  @ApiProperty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  coverLetter: string;

  @ApiProperty({ type: ProposedBudgetDto })
  @ValidateNested()
  @Type(() => ProposedBudgetDto)
  proposedBudget: ProposedBudgetDto;

  @ApiProperty({ type: TimelineDto })
  @ValidateNested()
  @Type(() => TimelineDto)
  timeline: TimelineDto;

  @ApiPropertyOptional({ type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptional({ type: [MilestoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones?: MilestoneDto[];
}

export class UpdateProposalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  coverLetter?: string;

  @ApiPropertyOptional({ type: ProposedBudgetDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProposedBudgetDto)
  proposedBudget?: ProposedBudgetDto;

  @ApiPropertyOptional({ type: TimelineDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimelineDto)
  timeline?: TimelineDto;

  @ApiPropertyOptional({ type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptional({ type: [MilestoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones?: MilestoneDto[];

  @ApiPropertyOptional({ enum: ['submitted', 'shortlisted', 'accepted', 'rejected', 'withdrawn'] })
  @IsOptional()
  @IsIn(['submitted', 'shortlisted', 'accepted', 'rejected', 'withdrawn'])
  status?: string;
}

export class ProposalResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  freelancerId: string;

  @ApiProperty()
  coverLetter: string;

  @ApiProperty()
  proposedBudget: ProposedBudgetDto;

  @ApiProperty()
  timeline: TimelineDto;

  @ApiProperty({ type: [AttachmentDto] })
  attachments: AttachmentDto[];

  @ApiProperty({ type: [MilestoneDto] })
  milestones: MilestoneDto[];

  @ApiProperty()
  status: string;

  @ApiProperty()
  submittedAt: Date;

  @ApiPropertyOptional()
  respondedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
