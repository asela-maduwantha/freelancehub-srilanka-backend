import { ApiProperty } from '@nestjs/swagger';

export class FileDataDto {
  @ApiProperty({
    description: 'The URL of the uploaded file in Azure Blob Storage',
    example:
      'https://freelancehub.blob.core.windows.net/freelancehub/contracts/uuid-filename.pdf',
  })
  url: string;

  @ApiProperty({
    description: 'The original filename',
    example: 'contract.pdf',
  })
  fileName: string;

  @ApiProperty({
    description: 'The MIME type of the file',
    example: 'application/pdf',
  })
  mimeType: string;

  @ApiProperty({
    description: 'The size of the file in bytes',
    example: 1024000,
  })
  size: number;
}

export class UploadResponseDto {
  @ApiProperty({
    description: 'Indicates if the upload was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message describing the result',
    example: 'File uploaded successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Data about the uploaded file',
    type: FileDataDto,
  })
  data: FileDataDto;
}

export class UploadMultipleResponseDto {
  @ApiProperty({
    description: 'Indicates if the upload was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message describing the result',
    example: '3 files uploaded successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Data about the uploaded files',
    type: [FileDataDto],
  })
  data: FileDataDto[];
}
