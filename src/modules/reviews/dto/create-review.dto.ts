import { IsNotEmpty, IsString, IsNumber, Min, Max, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewCategoriesDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  communication?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  quality?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  deadlines?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  professionalism?: number;
}

export class CreateReviewDto {
  @IsNotEmpty()
  @IsString()
  contractId: string;

  @IsNotEmpty()
  @IsString()
  revieweeId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsNotEmpty()
  @IsString()
  comment: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReviewCategoriesDto)
  categories?: ReviewCategoriesDto;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}