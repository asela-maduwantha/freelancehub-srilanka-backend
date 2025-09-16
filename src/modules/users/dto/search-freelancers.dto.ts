import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max, IsArray, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchFreelancersDto {
  @ApiPropertyOptional({
    description: 'Search query for freelancer name or skills',
    example: 'web developer',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter by skills (array of skill names)',
    example: ['JavaScript', 'React', 'Node.js'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({
    description: 'Minimum rating (0-5)',
    example: 4.0,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({
    description: 'Location filter',
    example: 'New York',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Experience level',
    enum: ['beginner', 'intermediate', 'expert'],
    example: 'intermediate',
  })
  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'expert'])
  experienceLevel?: string;

  @ApiPropertyOptional({
    description: 'Minimum hourly rate',
    example: 50,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minHourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Maximum hourly rate',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxHourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}