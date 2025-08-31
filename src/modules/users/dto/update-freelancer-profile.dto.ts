import { IsOptional, IsString, IsNumber, IsArray, IsEnum, IsUrl } from 'class-validator';

export class UpdateFreelancerProfileDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'expert'])
  experience?: string;

  @IsOptional()
  education?: {
    degree: string;
    institution: string;
    year: number;
  }[];

  @IsOptional()
  certifications?: {
    name: string;
    issuer: string;
    date: Date;
    url: string;
  }[];

  @IsOptional()
  portfolio?: {
    title: string;
    description: string;
    images: string[];
    url: string;
    tags: string[];
  }[];

  @IsOptional()
  @IsNumber()
  hourlyRate?: number;

  @IsOptional()
  @IsEnum(['full-time', 'part-time', 'not-available'])
  availability?: string;

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
