// src/modules/jobs/dto/job-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { JobStatus } from '../../../common/enums/job-status.enum';

export class BudgetResponseDto {
  @ApiProperty({ enum: ['fixed', 'hourly', 'range'] })
  type: string;

  @ApiProperty()
  min: number;

  @ApiPropertyOptional()
  max?: number;

  @ApiProperty()
  currency: string;
}

export class DurationResponseDto {
  @ApiProperty({
    enum: [
      'less-than-1-month',
      '1-3-months',
      '3-6-months',
      'more-than-6-months',
    ],
  })
  type: string;

  @ApiPropertyOptional()
  estimatedHours?: number;
}

export class AttachmentResponseDto {
  @ApiProperty()
  filename: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  type: string;
}

export class JobLocationResponseDto {
  @ApiProperty({ enum: ['remote', 'onsite', 'hybrid'] })
  type: string;

  @ApiPropertyOptional({ type: [String] })
  countries?: string[];

  @ApiPropertyOptional()
  timezone?: string;
}

export class ClientResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  fullName?: string;

  @ApiPropertyOptional()
  avatar?: string;
}

export class JobResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: ClientResponseDto })
  @Type(() => ClientResponseDto)
  client: ClientResponseDto;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  category: string;

  @ApiPropertyOptional()
  subcategory?: string;

  @ApiProperty({ enum: ['fixed-price', 'hourly'] })
  projectType: string;

  @ApiProperty({ type: BudgetResponseDto })
  @Type(() => BudgetResponseDto)
  budget: BudgetResponseDto;

  @ApiPropertyOptional({ type: DurationResponseDto })
  @Type(() => DurationResponseDto)
  duration?: DurationResponseDto;

  @ApiProperty({ type: [String] })
  skills: string[];

  @ApiPropertyOptional({ enum: ['beginner', 'intermediate', 'expert'] })
  experienceLevel?: string;

  @ApiProperty({ enum: JobStatus })
  status: JobStatus;

  @ApiProperty()
  isUrgent: boolean;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty({ type: [AttachmentResponseDto] })
  @Type(() => AttachmentResponseDto)
  attachments: AttachmentResponseDto[];

  @ApiPropertyOptional({ type: JobLocationResponseDto })
  @Type(() => JobLocationResponseDto)
  location?: JobLocationResponseDto;

  @ApiProperty()
  proposalCount: number;

  @ApiPropertyOptional()
  maxProposals?: number;

  @ApiPropertyOptional()
  selectedProposalId?: string;

  @ApiPropertyOptional()
  contractId?: string;

  @ApiProperty()
  postedAt: Date;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Virtual fields
  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isExpired: boolean;

  @ApiProperty()
  canReceiveProposals: boolean;
}

export class JobsListResponseDto {
  @ApiProperty({ type: [JobResponseDto] })
  @Type(() => JobResponseDto)
  jobs: JobResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class MessageResponseDto {
  @ApiProperty()
  message: string;
}