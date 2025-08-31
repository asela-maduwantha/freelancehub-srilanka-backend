import { IsNotEmpty, IsString, IsNumber, IsEnum, IsArray, IsOptional, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty()
  @IsString()
  revieweeId: string;

  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsNotEmpty()
  @IsString()
  review: string;

  @IsEnum(['freelancer', 'client'])
  reviewType: string;

  @IsOptional()
  @IsArray()
  criteria?: {
    category: string;
    rating: number;
  }[];

  @IsOptional()
  @IsEnum(['public', 'private'])
  visibility?: string;
}
