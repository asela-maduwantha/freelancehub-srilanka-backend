import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsMongoId, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewQueryDto {
  @ApiPropertyOptional({ description: 'Page number for pagination', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by reviewee ID' })
  @IsOptional()
  @IsMongoId()
  revieweeId?: string;

  @ApiPropertyOptional({ description: 'Filter by reviewer ID' })
  @IsOptional()
  @IsMongoId()
  reviewerId?: string;

  @ApiPropertyOptional({ description: 'Filter by contract ID' })
  @IsOptional()
  @IsMongoId()
  contractId?: string;

  @ApiPropertyOptional({ description: 'Minimum rating filter', minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Maximum rating filter', minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  maxRating?: number;
}