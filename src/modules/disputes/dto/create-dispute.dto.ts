import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsMongoId,
  MaxLength,
  MinLength,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDisputeDto {
  @ApiProperty({
    description: 'Contract ID that this dispute is related to',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  contractId: string;

  @ApiPropertyOptional({
    description: 'Milestone ID if dispute is related to a specific milestone',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  milestoneId?: string;

  @ApiProperty({
    description: 'Type of dispute',
    enum: ['payment', 'quality', 'scope', 'deadline', 'other'],
    example: 'payment',
  })
  @IsEnum(['payment', 'quality', 'scope', 'deadline', 'other'])
  type: string;

  @ApiProperty({
    description: 'Short reason for the dispute',
    example: 'Payment not received',
    minLength: 10,
    maxLength: 200,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  reason: string;

  @ApiProperty({
    description: 'Detailed description of the dispute',
    example: 'The client has not released payment for the completed milestone despite multiple reminders.',
    minLength: 50,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(50)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({
    description: 'Disputed amount (if applicable)',
    example: 500.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Array of evidence file URLs',
    example: ['https://example.com/evidence1.pdf', 'https://example.com/evidence2.png'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];
}
