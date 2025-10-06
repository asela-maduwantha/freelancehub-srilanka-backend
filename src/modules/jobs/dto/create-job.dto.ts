import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class BudgetDto {
  @ApiProperty({
    enum: ['fixed', 'hourly', 'range'],
    description: 'Budget type',
  })
  @IsEnum(['fixed', 'hourly', 'range'])
  type: string;

  @ApiProperty({ description: 'Minimum budget amount', minimum: 0 })
  @IsNumber()
  @Min(0)
  min: number;

  @ApiPropertyOptional({ description: 'Maximum budget amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max?: number;

  @ApiPropertyOptional({ description: 'Currency', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';
}

class DurationDto {
  @ApiProperty({ description: 'Duration value', minimum: 1 })
  @IsNumber()
  @Min(1)
  value: number;

  @ApiProperty({
    enum: ['days', 'weeks', 'months'],
    description: 'Duration unit',
  })
  @IsEnum(['days', 'weeks', 'months'])
  unit: string;
}

class AttachmentDto {
  @ApiProperty({ description: 'Attachment filename' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ description: 'Attachment URL' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: 'Attachment size in bytes', minimum: 0 })
  @IsNumber()
  @Min(0)
  size: number;

  @ApiProperty({ description: 'Attachment MIME type' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ description: 'File ID reference (optional)' })
  @IsOptional()
  @IsString()
  fileId?: string;
}



export class CreateJobDto {
  @ApiProperty({ description: 'Job title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Job description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Job category' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: 'Job subcategory' })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiProperty({
    enum: ['fixed-price'],
    description: 'Project type',
  })
  @IsEnum(['fixed-price'])
  projectType: string;

  @ApiProperty({ description: 'Job budget', type: BudgetDto })
  @ValidateNested()
  @Type(() => BudgetDto)
  budget: BudgetDto;

  @ApiPropertyOptional({ description: 'Project duration', type: DurationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DurationDto)
  duration?: DurationDto;

  @ApiProperty({ description: 'Required skills', type: [String] })
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @ApiPropertyOptional({
    enum: ['beginner', 'intermediate', 'expert'],
    description: 'Experience level required',
  })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'expert'])
  experienceLevel?: string;

  @ApiPropertyOptional({
    description: 'Is this an urgent job?',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean = false;

  @ApiPropertyOptional({
    description: 'Is this a featured job?',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean = false;

  @ApiPropertyOptional({
    description: 'Job attachments',
    type: [AttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];



  @ApiPropertyOptional({
    description: 'Maximum number of proposals',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxProposals?: number;

  @ApiPropertyOptional({ description: 'Job expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}
