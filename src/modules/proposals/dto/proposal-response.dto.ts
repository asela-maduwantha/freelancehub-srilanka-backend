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

export class ProposalClientResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  fullName?: string;

  @ApiPropertyOptional()
  avatar?: string;
}

export class ProposalFreelancerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  fullName?: string;

  @ApiPropertyOptional()
  avatar?: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  skills?: string[];
}

export class ProposalJobResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  category: string;

  @ApiPropertyOptional()
  subcategory?: string;

  @ApiProperty({ enum: ['fixed-price', 'hourly'] })
  projectType: string;

  @ApiPropertyOptional()
  budget?: any;

  @ApiProperty({ type: ProposalClientResponseDto })
  @Type(() => ProposalClientResponseDto)
  client: ProposalClientResponseDto;
}

export class ProposalResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id: string;

  @ApiProperty({ type: ProposalJobResponseDto })
  @Type(() => ProposalJobResponseDto)
  job: ProposalJobResponseDto;

  @ApiProperty({ type: ProposalFreelancerResponseDto })
  @Type(() => ProposalFreelancerResponseDto)
  freelancer: ProposalFreelancerResponseDto;

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
