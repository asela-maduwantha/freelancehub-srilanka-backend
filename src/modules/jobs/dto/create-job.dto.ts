import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsOptional,
  IsNumber,
  Min,
  IsIn,
  ValidateNested,
  IsObject,
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
  @ApiProperty({
    enum: [
      'less-than-1-month',
      '1-3-months',
      '3-6-months',
      'more-than-6-months',
    ],
    description: 'Project duration type',
  })
  @IsEnum([
    'less-than-1-month',
    '1-3-months',
    '3-6-months',
    'more-than-6-months',
  ])
  type: string;

  @ApiPropertyOptional({ description: 'Estimated hours', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedHours?: number;
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
}

class JobLocationDto {
  @ApiProperty({
    enum: ['remote', 'onsite', 'hybrid'],
    description: 'Job location type',
  })
  @IsEnum(['remote', 'onsite', 'hybrid'])
  type: string;

  @ApiPropertyOptional({ description: 'Allowed countries', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countries?: string[];

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;
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
    enum: ['fixed-price', 'hourly'],
    description: 'Project type',
  })
  @IsEnum(['fixed-price', 'hourly'])
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
  @IsIn([true, false])
  isUrgent?: boolean = false;

  @ApiPropertyOptional({
    description: 'Is this a featured job?',
    default: false,
  })
  @IsOptional()
  @IsIn([true, false])
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

  @ApiPropertyOptional({ description: 'Job location', type: JobLocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => JobLocationDto)
  location?: JobLocationDto;

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
  expiresAt?: Date;
}
