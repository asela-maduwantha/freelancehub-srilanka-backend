import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  Min,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;
}

export class UpdateAttachmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class UpdateDurationDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  value?: number;

  @IsOptional()
  @IsEnum(['days', 'weeks', 'months'])
  unit?: 'days' | 'weeks' | 'months';
}

export class UpdateProposalDto {
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  proposedBudget?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDurationDto)
  proposedDuration?: UpdateDurationDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateMilestoneDto)
  milestones?: UpdateMilestoneDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAttachmentDto)
  attachments?: UpdateAttachmentDto[];
}
