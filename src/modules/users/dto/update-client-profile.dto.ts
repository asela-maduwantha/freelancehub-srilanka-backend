import {
  IsOptional,
  IsString,
  IsEnum,
  IsUrl,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClientProfileDto {
  @ApiPropertyOptional({
    description: 'The name of the company',
    example: 'ABC Corp',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    description: 'The size of the company',
    example: '11-50',
    enum: ['1-10', '11-50', '51-200', '200+'],
  })
  @IsOptional()
  @IsEnum(['1-10', '11-50', '51-200', '200+'])
  companySize?: string;

  @ApiPropertyOptional({
    description: 'The industry of the company',
    example: 'Technology',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    description: 'The website URL of the company',
    example: 'https://example.com',
    format: 'url',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'A description of the company',
    example: 'A leading tech company',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the company profile is verified',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}
