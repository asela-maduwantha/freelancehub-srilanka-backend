import { IsNotEmpty, IsNumber, IsString, IsArray, IsOptional, Min, ValidateNested, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PricingDto {
  @ApiProperty({ description: 'The amount for the pricing', type: 'number', example: 500, minimum: 0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'The currency for the pricing', example: 'USD' })
  @IsNotEmpty()
  @IsString()
  currency: string;

  @ApiProperty({ description: 'The type of pricing', enum: ['fixed', 'hourly'], example: 'fixed' })
  @IsNotEmpty()
  @IsEnum(['fixed', 'hourly'])
  type: 'fixed' | 'hourly';

  @ApiPropertyOptional({ description: 'The estimated hours', type: 'number', example: 0 })
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @ApiPropertyOptional({ description: 'The breakdown of the pricing', example: 'Detailed breakdown...' })
  @IsOptional()
  @IsString()
  breakdown?: string;
}

export class MilestoneDto {
  @ApiProperty({ description: 'The title of the milestone', example: 'Front End' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'The description of the milestone', example: 'Complete front end development' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: 'The delivery date for the milestone', example: '2025-09-15' })
  @IsNotEmpty()
  @IsDateString()
  deliveryDate: string;

  @ApiProperty({ description: 'The amount for the milestone', type: 'number', example: 100, minimum: 0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;
}

export class TimelineDto {
  @ApiProperty({ description: 'The delivery time in days', type: 'number', example: 50, minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  deliveryTime: number;

  @ApiProperty({ description: 'The start date', example: '2025-09-01' })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'The list of milestones', type: [MilestoneDto] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones: MilestoneDto[];
}

export class AttachmentDto {
  @ApiProperty({ description: 'The URL of the attachment', example: 'https://freelancehub.blob.core.windows.net/freelancehubfiles/proposals/file.pdf' })
  @IsNotEmpty()
  @IsString()
  url: string;

  @ApiProperty({ description: 'The file type of the attachment', example: 'application/pdf' })
  @IsNotEmpty()
  @IsString()
  fileType: string;

  @ApiProperty({ description: 'The file size of the attachment', type: 'number', example: 84211 })
  @IsNotEmpty()
  @IsNumber()
  fileSize: number;

  @ApiPropertyOptional({ description: 'The description of the attachment', example: '' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class SubmitProposalDto {
  @ApiPropertyOptional({ description: 'The ID of the project (optional if passed in URL)', example: 'proj123' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ description: 'The cover letter for the proposal', example: 'I am excited to work on this project...' })
  @IsNotEmpty()
  @IsString()
  coverLetter: string;

  @ApiProperty({ description: 'The pricing details', type: () => PricingDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PricingDto)
  pricing: PricingDto;

  @ApiProperty({ description: 'The timeline details', type: () => TimelineDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => TimelineDto)
  timeline: TimelineDto;

  @ApiPropertyOptional({ description: 'The estimated duration', type: 'number', example: 0 })
  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: 'The list of portfolio links', type: [String], example: ['https://www.abc.com'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  portfolioLinks?: string[];

  @ApiPropertyOptional({ description: 'The list of attachments', type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptional({ description: 'Additional information', example: 'Additional details...' })
  @IsOptional()
  @IsString()
  additionalInfo?: string;

  // Legacy fields for backward compatibility
  @ApiPropertyOptional({ description: 'Legacy proposed budget field', type: 'number', example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  proposedBudget?: number;

  @ApiPropertyOptional({ description: 'Legacy proposed duration field', type: 'number', example: 30 })
  @IsOptional()
  @IsNumber()
  proposedDuration?: number;
}
