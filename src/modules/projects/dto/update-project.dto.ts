import { IsOptional, IsString, IsNumber, IsEnum, IsArray, IsDateString, Min } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @IsOptional()
  @IsEnum(['fixed', 'hourly'])
  budgetType?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  budget?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minBudget?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxBudget?: number;

  @IsOptional()
  @IsEnum(['short-term', 'long-term', 'ongoing'])
  duration?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workType?: string[];

  @IsOptional()
  @IsEnum(['basic', 'standard', 'premium'])
  experienceLevel?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
