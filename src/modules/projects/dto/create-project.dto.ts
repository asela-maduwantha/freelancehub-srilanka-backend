import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsOptional,
  IsDateString,
  Min,
  Max,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Project title',
    example: 'ABC web application development',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Project description',
    example: 'Write a description...',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Project category',
    example: 'technology',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Project subcategory', example: '' })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiProperty({
    description: 'Required skills',
    example: ['JavaScript', 'Node.js'],
  })
  @IsArray()
  @IsString({ each: true })
  requiredSkills: string[];

  @ApiProperty({
    description: 'Project type',
    example: 'fixed',
    enum: ['fixed', 'hourly'],
  })
  @IsEnum(['fixed', 'hourly'])
  type: string;

  @ApiProperty({
    description: 'Budget object',
    type: 'object',
    properties: {
      amount: { type: 'number' },
      currency: { type: 'string' },
      type: { type: 'string' },
    },
  })
  @IsObject()
  budget: {
    amount: number;
    currency: string;
    type: string;
  };

  @ApiProperty({
    description: 'Timeline object',
    type: 'object',
    properties: {
      deadline: { type: 'string' },
      duration: { type: 'number' },
      isUrgent: { type: 'boolean' },
      isFlexible: { type: 'boolean' },
    },
  })
  @IsObject()
  timeline: {
    deadline: string;
    duration: number;
    isUrgent: boolean;
    isFlexible: boolean;
  };

  @ApiProperty({
    description: 'Requirements object',
    type: 'object',
    properties: {
      experienceLevel: { type: 'string' },
      minimumRating: { type: 'number' },
      minimumCompletedProjects: { type: 'number' },
      preferredLanguages: { type: 'array', items: { type: 'string' } },
      preferredCountries: { type: 'array', items: { type: 'string' } },
    },
  })
  @IsObject()
  requirements: {
    experienceLevel: string;
    minimumRating: number;
    minimumCompletedProjects: number;
    preferredLanguages: string[];
    preferredCountries: string[];
  };

  @ApiProperty({
    description: 'Project visibility',
    example: 'public',
    enum: ['public', 'private'],
  })
  @IsEnum(['public', 'private'])
  visibility: string;

  @ApiPropertyOptional({ description: 'Project tags', example: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
