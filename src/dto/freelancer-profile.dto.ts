import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  IsIn,
  IsUrl,
  ValidateNested,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LocationDto {
  @ApiProperty()
  @IsString()
  country: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  province: string;
}

class WorkingHoursDto {
  @ApiProperty()
  @IsString()
  timezone: string;

  @ApiProperty()
  @IsObject()
  schedule: Record<string, any>;
}

class AvailabilityDto {
  @ApiProperty({ enum: ['available', 'busy', 'unavailable'] })
  @IsIn(['available', 'busy', 'unavailable'])
  status: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(168)
  hoursPerWeek: number;

  @ApiProperty({ type: WorkingHoursDto })
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours: WorkingHoursDto;
}

class PortfolioItemDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  projectUrl?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

class EducationDto {
  @ApiProperty()
  @IsString()
  institution: string;

  @ApiProperty()
  @IsString()
  degree: string;

  @ApiProperty()
  @IsString()
  field: string;

  @ApiProperty()
  @IsNumber()
  year: number;
}

class CertificationDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  issuer: string;

  @ApiProperty()
  @IsNumber()
  year: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  url?: string;
}

class LanguageDto {
  @ApiProperty()
  @IsString()
  language: string;

  @ApiProperty({ enum: ['basic', 'intermediate', 'fluent', 'native'] })
  @IsIn(['basic', 'intermediate', 'fluent', 'native'])
  proficiency: string;
}

export class CreateFreelancerProfileDto {
  @ApiProperty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  professionalTitle: string;

  @ApiProperty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @ApiProperty({ enum: ['beginner', 'intermediate', 'expert'] })
  @IsIn(['beginner', 'intermediate', 'expert'])
  experienceLevel: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  hourlyRate: number;

  @ApiProperty({ type: AvailabilityDto })
  @ValidateNested()
  @Type(() => AvailabilityDto)
  availability: AvailabilityDto;

  @ApiPropertyOptional({ type: [PortfolioItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioItemDto)
  portfolio?: PortfolioItemDto[];

  @ApiPropertyOptional({ type: [EducationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiPropertyOptional({ type: [CertificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];

  @ApiPropertyOptional({ type: [LanguageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages?: LanguageDto[];

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty()
  @IsString()
  publicProfileUrl: string;
}

export class UpdateFreelancerProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  professionalTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ enum: ['beginner', 'intermediate', 'expert'] })
  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'expert'])
  experienceLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  hourlyRate?: number;

  @ApiPropertyOptional({ type: AvailabilityDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AvailabilityDto)
  availability?: AvailabilityDto;

  @ApiPropertyOptional({ type: [PortfolioItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioItemDto)
  portfolio?: PortfolioItemDto[];

  @ApiPropertyOptional({ type: [EducationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiPropertyOptional({ type: [CertificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];

  @ApiPropertyOptional({ type: [LanguageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages?: LanguageDto[];

  @ApiPropertyOptional({ type: LocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publicProfileUrl?: string;
}

export class FreelancerProfileResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  professionalTitle: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [String] })
  skills: string[];

  @ApiProperty({ type: [String] })
  categories: string[];

  @ApiProperty()
  experienceLevel: string;

  @ApiProperty()
  hourlyRate: number;

  @ApiProperty()
  availability: AvailabilityDto;

  @ApiProperty({ type: [PortfolioItemDto] })
  portfolio: PortfolioItemDto[];

  @ApiProperty({ type: [EducationDto] })
  education: EducationDto[];

  @ApiProperty({ type: [CertificationDto] })
  certifications: CertificationDto[];

  @ApiProperty({ type: [LanguageDto] })
  languages: LanguageDto[];

  @ApiProperty()
  location: LocationDto;

  @ApiProperty()
  profileCompleteness: number;

  @ApiProperty()
  publicProfileUrl: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
