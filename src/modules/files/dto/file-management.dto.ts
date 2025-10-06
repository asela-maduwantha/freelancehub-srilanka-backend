import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsNumber, Min, Max } from 'class-validator';

export class ListFilesDto {
  @ApiPropertyOptional({
    description: 'File type filter',
    enum: ['avatar', 'document', 'portfolio', 'evidence', 'milestone_deliverable', 'other', 'all'],
    default: 'all',
  })
  @IsOptional()
  @IsEnum(['avatar', 'document', 'portfolio', 'evidence', 'milestone_deliverable', 'other', 'all'])
  fileType?: string;

  @ApiPropertyOptional({
    description: 'Contract ID filter',
  })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiPropertyOptional({
    description: 'Milestone ID filter',
  })
  @IsOptional()
  @IsString()
  milestoneId?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['createdAt', 'filename', 'size'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'filename', 'size'])
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string;
}

export class FileMetadataDto {
  @ApiProperty({ description: 'File ID' })
  id: string;

  @ApiProperty({ description: 'Original filename' })
  filename: string;

  @ApiProperty({ description: 'Original name when uploaded' })
  originalName: string;

  @ApiProperty({ description: 'File URL' })
  url: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiProperty({ description: 'MIME type' })
  mimeType: string;

  @ApiProperty({ description: 'File type category' })
  fileType: string;

  @ApiProperty({ description: 'Description', required: false })
  description?: string;

  @ApiProperty({ description: 'Uploaded by user ID' })
  uploadedBy: string;

  @ApiProperty({ description: 'Contract ID', required: false })
  contractId?: string;

  @ApiProperty({ description: 'Milestone ID', required: false })
  milestoneId?: string;

  @ApiProperty({ description: 'Dispute ID', required: false })
  disputeId?: string;

  @ApiProperty({ description: 'Uploader name', required: false })
  uploadedByName?: string;

  @ApiProperty({ description: 'Upload timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last updated timestamp' })
  updatedAt: Date;
}

export class FileResponseDto {
  @ApiProperty({ description: 'Success flag' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'File data', type: FileMetadataDto })
  data: FileMetadataDto;
}

export class FileListResponseDto {
  @ApiProperty({ description: 'Success flag' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ 
    description: 'Files data',
    type: 'object',
    properties: {
      files: { type: 'array', items: { $ref: '#/components/schemas/FileMetadataDto' } },
      pagination: {
        type: 'object',
        properties: {
          total: { type: 'number' },
          page: { type: 'number' },
          limit: { type: 'number' },
          totalPages: { type: 'number' },
          hasMore: { type: 'boolean' },
        },
      },
    },
  })
  data: {
    files: FileMetadataDto[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasMore: boolean;
    };
  };
}

export class UpdateFileMetadataDto {
  @ApiPropertyOptional({ description: 'File description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'File type category', enum: ['avatar', 'document', 'portfolio', 'evidence', 'milestone_deliverable', 'other'] })
  @IsOptional()
  @IsEnum(['avatar', 'document', 'portfolio', 'evidence', 'milestone_deliverable', 'other'])
  fileType?: string;
}

export class DownloadUrlResponseDto {
  @ApiProperty({ description: 'Success flag' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({
    description: 'Download URL data',
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Presigned download URL' },
      expiresAt: { type: 'string', format: 'date-time', description: 'URL expiration time' },
      filename: { type: 'string', description: 'Original filename' },
    },
  })
  data: {
    url: string;
    expiresAt: Date;
    filename: string;
  };
}
