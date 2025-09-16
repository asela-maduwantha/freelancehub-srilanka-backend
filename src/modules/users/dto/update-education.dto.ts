import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEducationDto {
  @ApiPropertyOptional({
    description: 'Degree or qualification obtained',
    example: 'Master of Science in Computer Science',
  })
  @IsOptional()
  @IsString()
  degree?: string;

  @ApiPropertyOptional({
    description: 'Educational institution name',
    example: 'Updated University of Technology',
  })
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiPropertyOptional({
    description: 'Year of graduation or completion',
    example: 2022,
  })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 10) // Allow future years for current students
  year?: number;
}
