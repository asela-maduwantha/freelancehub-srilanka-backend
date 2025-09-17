import {
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFreelancerProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['full-time', 'part-time', 'contract'])
  availability?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'expert'])
  experience?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];
}
