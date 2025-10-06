import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Document file to upload (PDF, DOC, DOCX, TXT, ZIP)',
  })
  file: Express.Multer.File;

  @ApiProperty({
    description: 'Optional metadata for the file',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class FileUploadResponseDto {
  @ApiProperty({
    description: 'Original filename of the uploaded file',
    example: 'milestone-deliverable.pdf',
  })
  filename: string;

  @ApiProperty({
    description: 'Public URL to access the uploaded file',
    example: 'https://yourstorageaccount.blob.core.windows.net/documents/1234567890-abc123.pdf',
  })
  url: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 2048576,
  })
  size: number;

  @ApiProperty({
    description: 'MIME type of the uploaded file',
    example: 'application/pdf',
  })
  type: string;

  @ApiProperty({
    description: 'Database file record ID',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  fileId?: string;
}

export class UploadFileSuccessResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'File uploaded successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Uploaded file information',
    type: FileUploadResponseDto,
  })
  data: FileUploadResponseDto;
}
