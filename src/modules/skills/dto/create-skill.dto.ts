import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, Min, IsEnum } from 'class-validator';

export class CreateSkillDto {
  @ApiProperty({ description: 'Name of the skill' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Unique slug for the skill (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'Description of the skill' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Synonyms for the skill', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  synonyms?: string[];

  @ApiPropertyOptional({ description: 'Related skills', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedSkills?: string[];

  @ApiPropertyOptional({ description: 'Category of the skill', default: 'technical' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Difficulty level', enum: ['beginner', 'intermediate', 'expert'], default: 'intermediate' })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ description: 'Whether the skill is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Usage count', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usageCount?: number;

  @ApiPropertyOptional({ description: 'Demand score', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  demandScore?: number;

  @ApiPropertyOptional({ description: 'Icon for the skill' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Color for the skill' })
  @IsOptional()
  @IsString()
  color?: string;
}
