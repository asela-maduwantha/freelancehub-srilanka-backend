// src/modules/proposals/dto/create-proposal.dto.ts
import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, IsArray, ValidateNested, Min, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ProposedRateDto {
  @ApiProperty({ example: 50, description: 'Proposed amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'fixed', enum: ['fixed', 'hourly'] })
  @IsEnum(['fixed', 'hourly'])
  type: string;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;
}

class EstimatedDurationDto {
  @ApiProperty({ example: 30, description: 'Duration value' })
  @IsNumber()
  @Min(1)
  value: number;

  @ApiProperty({ example: 'days', enum: ['days', 'weeks', 'months'] })
  @IsEnum(['days', 'weeks', 'months'])
  unit: string;
}

class ProposedMilestoneDto {
  @ApiProperty({ example: 'Initial setup', description: 'Milestone title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Set up the project structure', description: 'Milestone description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 500, description: 'Milestone amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 7, description: 'Duration in days' })
  @IsNumber()
  @Min(1)
  durationDays: number;
}

class ProposalAttachmentDto {
  @ApiProperty({ example: 'document.pdf', description: 'Attachment filename' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ example: 'https://example.com/document.pdf', description: 'Attachment URL' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ example: 1024, description: 'Attachment size in bytes' })
  @IsNumber()
  @Min(0)
  size: number;

  @ApiProperty({ example: 'application/pdf', description: 'Attachment type' })
  @IsString()
  @IsNotEmpty()
  type: string;
}

export class CreateProposalDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Job ID' })
  @IsMongoId()
  @IsNotEmpty()
  jobId: string;

  @ApiProperty({ example: 'I am excited to work on this project...', description: 'Cover letter' })
  @IsString()
  @IsNotEmpty()
  coverLetter: string;

  @ApiProperty({ type: ProposedRateDto, description: 'Proposed rate' })
  @ValidateNested()
  @Type(() => ProposedRateDto)
  proposedRate: ProposedRateDto;

  @ApiPropertyOptional({ type: EstimatedDurationDto, description: 'Estimated duration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EstimatedDurationDto)
  estimatedDuration?: EstimatedDurationDto;

  @ApiPropertyOptional({ type: [ProposedMilestoneDto], description: 'Proposed milestones' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposedMilestoneDto)
  proposedMilestones?: ProposedMilestoneDto[];

  @ApiPropertyOptional({ type: [ProposalAttachmentDto], description: 'Attachments' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalAttachmentDto)
  attachments?: ProposalAttachmentDto[];
}