import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
  MinLength,
  MaxLength,
  IsMongoId,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveDisputeDto {
  @ApiProperty({
    description: 'Resolution decision',
    enum: ['favor_client', 'favor_freelancer', 'partial_refund', 'no_action'],
    example: 'favor_freelancer',
  })
  @IsEnum(['favor_client', 'favor_freelancer', 'partial_refund', 'no_action'])
  resolution: string;

  @ApiProperty({
    description: 'Detailed explanation of the resolution',
    example: 'After reviewing the evidence, the freelancer has completed the work as agreed.',
    minLength: 50,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(50)
  @MaxLength(2000)
  resolutionDetails: string;

  @ApiPropertyOptional({
    description: 'Refund amount if applicable (for partial_refund or favor_client)',
    example: 250.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;

  @ApiPropertyOptional({
    description: 'User ID who receives the favored amount (if applicable)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  favoredUserId?: string;
}

export class AddEvidenceDto {
  @ApiProperty({
    description: 'Evidence file URL',
    example: 'https://example.com/evidence.pdf',
  })
  @IsString()
  fileUrl: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'contract_agreement.pdf',
  })
  @IsString()
  filename: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  size: number;

  @ApiProperty({
    description: 'File MIME type',
    example: 'application/pdf',
  })
  @IsString()
  type: string;
}

export class UpdateDisputeStatusDto {
  @ApiProperty({
    description: 'New status for the dispute',
    enum: ['open', 'in_review', 'resolved', 'closed', 'escalated'],
    example: 'in_review',
  })
  @IsEnum(['open', 'in_review', 'resolved', 'closed', 'escalated'])
  status: string;

  @ApiPropertyOptional({
    description: 'Optional notes about the status change',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
