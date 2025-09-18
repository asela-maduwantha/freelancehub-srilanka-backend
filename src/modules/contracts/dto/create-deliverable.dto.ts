import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeliverableDto {
  @ApiProperty({ description: 'Filename of the deliverable' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ description: 'URL of the uploaded file' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: 'File size in bytes', minimum: 0 })
  @IsNumber()
  @Min(0)
  size: number;

  @ApiProperty({ description: 'MIME type of the file' })
  @IsString()
  @IsNotEmpty()
  type: string;
}