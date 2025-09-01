import { IsNotEmpty, IsNumber, IsString, IsArray, IsOptional, Min, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MilestoneDto {
  @ApiProperty({ description: 'The title of the milestone', example: 'Design Phase' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'The description of the milestone', example: 'Complete UI/UX design' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: 'The amount for the milestone', type: 'number', example: 300, minimum: 0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'The duration for the milestone in days', type: 'number', example: 7, minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  duration: number;
}

export class AttachmentDto {
  @ApiProperty({ description: 'The name of the attachment', example: 'Proposal Document' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'The URL of the attachment', example: 'https://example.com/file.pdf' })
  @IsNotEmpty()
  @IsString()
  url: string;

  @ApiProperty({ description: 'The type of the attachment', example: 'pdf' })
  @IsNotEmpty()
  @IsString()
  type: string;
}

export class DurationDto {
  @ApiProperty({ description: 'The value of the duration', type: 'number', example: 2, minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  value: number;

  @ApiProperty({ description: 'The unit of the duration', enum: ['days', 'weeks', 'months'], example: 'weeks' })
  @IsNotEmpty()
  @IsEnum(['days', 'weeks', 'months'])
  unit: 'days' | 'weeks' | 'months';
}

export class SubmitProposalDto {
  @ApiProperty({ description: 'The ID of the project', example: 'proj123' })
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'The cover letter for the proposal', example: 'I am excited to work on this project...' })
  @IsNotEmpty()
  @IsString()
  coverLetter: string;

  @ApiProperty({ description: 'The proposed budget for the project', type: 'number', example: 1500, minimum: 0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  proposedBudget: number;

  @ApiProperty({ description: 'The proposed duration for the project', type: () => DurationDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => DurationDto)
  proposedDuration: DurationDto;

  @ApiPropertyOptional({ description: 'The list of milestones', type: [MilestoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones?: MilestoneDto[];

  @ApiPropertyOptional({ description: 'The list of attachments', type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
