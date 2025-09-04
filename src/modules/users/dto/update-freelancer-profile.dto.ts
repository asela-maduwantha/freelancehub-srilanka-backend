import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsEnum,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFreelancerProfileDto {
  @ApiPropertyOptional({
    description: 'The job title of the freelancer',
    example: 'Software Developer',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'A short biography of the freelancer',
    example: 'Experienced developer with 5 years in web development',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiPropertyOptional({
    description: 'List of skills of the freelancer',
    type: 'array',
    items: { type: 'string' },
    example: ['JavaScript', 'React'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({
    description: 'The experience level of the freelancer',
    enum: ['beginner', 'intermediate', 'expert'],
    example: 'intermediate',
  })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'expert'])
  experience?: string;

  @ApiPropertyOptional({
    description: 'List of education details',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        degree: { type: 'string', example: 'Bachelor of Science' },
        institution: { type: 'string', example: 'University of Example' },
        year: { type: 'number', example: 2020 },
      },
    },
  })
  @IsOptional()
  education?: {
    degree: string;
    institution: string;
    year: number;
  }[];

  @ApiPropertyOptional({
    description: 'List of certifications',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'AWS Certified' },
        issuer: { type: 'string', example: 'Amazon' },
        date: { type: 'string', format: 'date', example: '2023-01-01' },
        url: { type: 'string', example: 'https://cert.example.com' },
      },
    },
  })
  @IsOptional()
  certifications?: {
    name: string;
    issuer: string;
    date: Date;
    url: string;
  }[];

  @ApiPropertyOptional({
    description: 'List of portfolio items',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'E-commerce Website' },
        description: {
          type: 'string',
          example: 'A full-stack e-commerce site',
        },
        images: {
          type: 'array',
          items: { type: 'string' },
          example: ['https://img1.com', 'https://img2.com'],
        },
        url: { type: 'string', example: 'https://portfolio.example.com' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          example: ['React', 'Node.js'],
        },
      },
    },
  })
  @IsOptional()
  portfolio?: {
    title: string;
    description: string;
    images: string[];
    url: string;
    tags: string[];
  }[];

  @ApiPropertyOptional({
    description: 'The hourly rate of the freelancer',
    type: 'number',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  hourlyRate?: number;

  @ApiPropertyOptional({
    description: 'The availability status of the freelancer',
    enum: ['full-time', 'part-time', 'not-available', 'available'],
    example: 'available',
  })
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase())
  @IsEnum(['full-time', 'part-time', 'not-available', 'available'])
  availability?: string;

  @ApiPropertyOptional({
    description: 'The working hours of the freelancer',
    type: 'object',
    properties: {
      timezone: { type: 'string', example: 'EST' },
      hours: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            day: { type: 'string', example: 'Monday' },
            start: { type: 'string', example: '09:00' },
            end: { type: 'string', example: '17:00' },
          },
        },
      },
    },
  })
  @IsOptional()
  workingHours?: {
    timezone: string;
    hours: {
      day: string;
      start: string;
      end: string;
    }[];
  };
}
