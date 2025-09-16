// src/modules/users/dto/add-certification.dto.ts
import { IsNotEmpty, IsString, IsDateString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddCertificationDto {
  @ApiProperty({
    description: 'Name of the certification',
    example: 'AWS Certified Solutions Architect',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Issuing organization or authority',
    example: 'Amazon Web Services',
  })
  @IsNotEmpty()
  @IsString()
  issuer: string;

  @ApiProperty({
    description: 'Date when the certification was obtained',
    example: '2023-06-15',
  })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    description: 'URL to verify the certification',
    example: 'https://aws.amazon.com/verification/certification-id',
  })
  @IsOptional()
  @IsUrl()
  url?: string;
}