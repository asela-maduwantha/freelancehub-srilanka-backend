import { IsNotEmpty, IsString, IsNumber, IsEnum, IsArray, IsOptional, IsDateString, Min, Max } from 'class-validator';

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  requiredSkills: string[];

  @IsEnum(['fixed', 'hourly'])
  budgetType: string;

  @IsNumber()
  @Min(1)
  budget: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minBudget?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxBudget?: number;

  @IsEnum(['short-term', 'long-term', 'ongoing'])
  duration: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsArray()
  @IsString({ each: true })
  workType: string[];

  @IsEnum(['basic', 'standard', 'premium'])
  experienceLevel: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
