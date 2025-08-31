import { IsNotEmpty, IsNumber, IsString, IsArray, IsOptional, Min, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsNumber()
  @Min(1)
  duration: number;
}

export class AttachmentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  url: string;

  @IsNotEmpty()
  @IsString()
  type: string;
}

export class DurationDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  value: number;

  @IsNotEmpty()
  @IsEnum(['days', 'weeks', 'months'])
  unit: 'days' | 'weeks' | 'months';
}

export class SubmitProposalDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsString()
  coverLetter: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  proposedBudget: number;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => DurationDto)
  proposedDuration: DurationDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones?: MilestoneDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
