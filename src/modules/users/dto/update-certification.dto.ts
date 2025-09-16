// src/modules/users/dto/update-certification.dto.ts
import { IsOptional, IsString, IsDateString, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCertificationDto {
  @ApiPropertyOptional({
    description: 'Name of the certification',
    example: 'Updated AWS Certified Solutions Architect',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Issuing organization or authority',
    example: 'Amazon Web Services',
  })
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiPropertyOptional({
    description: 'Date when the certification was obtained',
    example: '2023-06-15',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'URL to verify the certification',
    example: 'https://aws.amazon.com/verification/certification-id',
  })
  @IsOptional()
  @IsUrl()
  url?: string;
}