import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateClientProfileDto {
  @ApiPropertyOptional({
    description: 'Company name',
    example: 'Tech Solutions Inc.',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Company size',
    enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
    example: '11-50',
  })
  @IsOptional()
  @IsIn(['1-10', '11-50', '51-200', '201-500', '500+'])
  companySize?: string;

  @ApiPropertyOptional({
    description: 'Industry',
    example: 'Technology',
  })
  @IsOptional()
  @IsString()
  industry?: string;
}
