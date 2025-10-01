import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  Min,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class BudgetDto {
  @ApiPropertyOptional({
    enum: ['fixed', 'hourly', 'range'],
    description: 'Budget type',
  })
  @IsOptional()
  @IsEnum(['fixed', 'hourly', 'range'])
  type?: string;

  @ApiPropertyOptional({ description: 'Minimum budget amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min?: number;

  @ApiPropertyOptional({ description: 'Maximum budget amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max?: number;

  @ApiPropertyOptional({ description: 'Currency' })
  @IsOptional()
  @IsString()
  currency?: string;
}

class DurationDto {
  @ApiPropertyOptional({ description: 'Duration value', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  value?: number;

  @ApiPropertyOptional({
    enum: ['days', 'weeks', 'months'],
    description: 'Duration unit',
  })
  @IsOptional()
  @IsEnum(['days', 'weeks', 'months'])
  unit?: string;
}

class AttachmentDto {
  @ApiPropertyOptional({ description: 'Attachment filename' })
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiPropertyOptional({ description: 'Attachment URL' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: 'Attachment size in bytes', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  size?: number;

  @ApiPropertyOptional({ description: 'Attachment MIME type' })
  @IsOptional()
  @IsString()
  type?: string;
}

class JobLocationDto {
  @ApiPropertyOptional({
    enum: ['remote', 'onsite', 'hybrid'],
    description: 'Job location type',
  })
  @IsOptional()
  @IsEnum(['remote', 'onsite', 'hybrid'])
  type?: string;

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

export class UpdateJobDto {
  @ApiPropertyOptional({ description: 'Job title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Job description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Job category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Job subcategory' })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({
    enum: ['fixed-price'],
    description: 'Project type',
  })
  @IsOptional()
  @IsEnum(['fixed-price'])
  projectType?: string;

  @ApiPropertyOptional({ description: 'Job budget', type: BudgetDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetDto)
  budget?: BudgetDto;

  @ApiPropertyOptional({ description: 'Project duration', type: DurationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DurationDto)
  duration?: DurationDto;

  @ApiPropertyOptional({ description: 'Required skills', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({
    enum: ['beginner', 'intermediate', 'expert'],
    description: 'Experience level required',
  })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'expert'])
  experienceLevel?: string;

  @ApiPropertyOptional({ description: 'Is this an urgent job?' })
  @IsOptional()
  @IsIn([true, false])
  isUrgent?: boolean;

  @ApiPropertyOptional({ description: 'Is this a featured job?' })
  @IsOptional()
  @IsIn([true, false])
  isFeatured?: boolean;

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

  @ApiPropertyOptional({
    enum: ['draft', 'open', 'awaiting-contract', 'contracted', 'in-progress', 'under-review', 'completed', 'closed', 'cancelled'],
    description: 'Job status',
  })
  @IsOptional()
  @IsEnum(['draft', 'open', 'awaiting-contract', 'contracted', 'in-progress', 'under-review', 'completed', 'closed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ description: 'Job expiration date' })
  @IsOptional()
  expiresAt?: Date;
}
