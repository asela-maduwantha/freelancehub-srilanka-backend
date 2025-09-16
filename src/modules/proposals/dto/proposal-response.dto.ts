// src/modules/proposals/dto/proposal-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProposalStatus } from '../../../common/enums/proposal-status.enum';

export class ProposedRateResponseDto {
  @ApiProperty()
  amount: number;

  @ApiProperty({ enum: ['fixed', 'hourly'] })
  type: string;

  @ApiProperty()
  currency: string;
}

export class EstimatedDurationResponseDto {
  @ApiProperty()
  value: number;

  @ApiProperty({ enum: ['days', 'weeks', 'months'] })
  unit: string;
}

export class ProposedMilestoneResponseDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  durationDays: number;
}

export class ProposalAttachmentResponseDto {
  @ApiProperty()
  filename: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  type: string;
}

export class ProposalResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  jobId: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  freelancerId: string;

  @ApiProperty()
  coverLetter: string;

  @ApiProperty({ type: ProposedRateResponseDto })
  @Type(() => ProposedRateResponseDto)
  proposedRate: ProposedRateResponseDto;

  @ApiPropertyOptional({ type: EstimatedDurationResponseDto })
  @Type(() => EstimatedDurationResponseDto)
  estimatedDuration?: EstimatedDurationResponseDto;

  @ApiProperty({ type: [ProposedMilestoneResponseDto] })
  @Type(() => ProposedMilestoneResponseDto)
  proposedMilestones: ProposedMilestoneResponseDto[];

  @ApiProperty({ type: [ProposalAttachmentResponseDto] })
  @Type(() => ProposalAttachmentResponseDto)
  attachments: ProposalAttachmentResponseDto[];

  @ApiProperty({ enum: ProposalStatus })
  status: ProposalStatus;

  @ApiProperty()
  clientViewed: boolean;

  @ApiPropertyOptional()
  clientViewedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ProposalsListResponseDto {
  @ApiProperty({ type: [ProposalResponseDto] })
  @Type(() => ProposalResponseDto)
  proposals: ProposalResponseDto[];

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