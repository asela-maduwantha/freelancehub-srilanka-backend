import { 
  IsString, 
  IsArray, 
  IsNumber, 
  IsOptional, 
  IsIn, 
  ValidateNested, 
  IsDate,
  Min
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BudgetDto {
  @ApiProperty({ enum: ['fixed', 'range'] })
  @IsIn(['fixed', 'range'])
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  minAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxAmount?: number;

  @ApiProperty({ enum: ['USD', 'EUR', 'LKR'] })
  @IsIn(['USD', 'EUR', 'LKR'])
  currency: string;
}

class DurationDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  estimated: number; // in days

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deadline?: Date;
}

class AttachmentDto {
  @ApiProperty()
  @IsString()
  filename: string;

  @ApiProperty()
  @IsString()
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  size?: number;
}

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiProperty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  requiredSkills: string[];

  @ApiProperty({ enum: ['fixed_price', 'hourly'] })
  @IsIn(['fixed_price', 'hourly'])
  projectType: string;

  @ApiProperty({ type: BudgetDto })
  @ValidateNested()
  @Type(() => BudgetDto)
  budget: BudgetDto;

  @ApiProperty({ type: DurationDto })
  @ValidateNested()
  @Type(() => DurationDto)
  duration: DurationDto;

  @ApiPropertyOptional({ type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiProperty({ enum: ['public', 'invite_only'] })
  @IsIn(['public', 'invite_only'])
  visibility: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @ApiPropertyOptional({ enum: ['fixed_price', 'hourly'] })
  @IsOptional()
  @IsIn(['fixed_price', 'hourly'])
  projectType?: string;

  @ApiPropertyOptional({ type: BudgetDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetDto)
  budget?: BudgetDto;

  @ApiPropertyOptional({ type: DurationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DurationDto)
  duration?: DurationDto;

  @ApiPropertyOptional({ type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptional({ enum: ['public', 'invite_only'] })
  @IsOptional()
  @IsIn(['public', 'invite_only'])
  visibility?: string;

  @ApiPropertyOptional({ enum: ['draft', 'active', 'closed', 'completed', 'cancelled'] })
  @IsOptional()
  @IsIn(['draft', 'active', 'closed', 'completed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class ProjectSearchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ enum: ['fixed_price', 'hourly'] })
  @IsOptional()
  @IsIn(['fixed_price', 'hourly'])
  projectType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minBudget?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxBudget?: number;

  @ApiPropertyOptional({ enum: ['USD', 'EUR', 'LKR'] })
  @IsOptional()
  @IsIn(['USD', 'EUR', 'LKR'])
  currency?: string;

  @ApiPropertyOptional({ enum: ['beginner', 'intermediate', 'expert'] })
  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'expert'])
  experienceLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: ['newest', 'oldest', 'budget_low', 'budget_high'] })
  @IsOptional()
  @IsIn(['newest', 'oldest', 'budget_low', 'budget_high'])
  sortBy?: string = 'newest';
}

export class ProjectResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  clientId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  category: string;

  @ApiProperty({ type: [String] })
  requiredSkills: string[];

  @ApiProperty()
  projectType: string;

  @ApiProperty()
  budget: BudgetDto;

  @ApiProperty()
  duration: DurationDto;

  @ApiProperty({ type: [AttachmentDto] })
  attachments: AttachmentDto[];

  @ApiProperty()
  visibility: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  proposalCount: number;

  @ApiProperty()
  viewCount: number;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiPropertyOptional()
  publishedAt?: Date;

  @ApiPropertyOptional()
  closedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
