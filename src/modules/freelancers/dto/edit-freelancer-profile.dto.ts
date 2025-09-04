import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsIn,
  IsObject,
  ValidateNested,
  IsUrl,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class LocationDto {
  @ApiProperty({ description: 'Country', example: 'Sri Lanka' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ description: 'City', example: 'Colombo' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ description: 'Timezone', example: 'Asia/Colombo' })
  @IsString()
  @IsOptional()
  timezone?: string;
}

class LanguageDto {
  @ApiProperty({ description: 'Language name', example: 'English' })
  @IsString()
  language: string;

  @ApiProperty({
    description: 'Proficiency level',
    example: 'fluent',
    enum: ['basic', 'conversational', 'fluent', 'native'],
  })
  @IsString()
  @IsIn(['basic', 'conversational', 'fluent', 'native'])
  proficiency: string;
}

class EducationDto {
  @ApiProperty({
    description: 'Degree or qualification',
    example: 'Bachelor of Computer Science',
  })
  @IsString()
  degree: string;

  @ApiProperty({
    description: 'Institution name',
    example: 'University of Colombo',
  })
  @IsString()
  institution: string;

  @ApiProperty({ description: 'Graduation year', example: 2020 })
  @IsNumber()
  @Min(1950)
  @Max(new Date().getFullYear() + 10)
  year: number;
}

class CertificationDto {
  @ApiProperty({
    description: 'Certification name',
    example: 'AWS Certified Developer',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Issuing organization',
    example: 'Amazon Web Services',
  })
  @IsString()
  issuer: string;

  @ApiProperty({ description: 'Issue date', example: '2023-01-15' })
  @IsString()
  date: string;

  @ApiProperty({
    description: 'Certificate URL',
    example: 'https://aws.amazon.com/certification',
  })
  @IsUrl()
  @IsOptional()
  url?: string;
}

class PortfolioItemDto {
  @ApiProperty({ description: 'Project title', example: 'E-commerce Website' })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Project description',
    example: 'A full-stack e-commerce platform',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Project images URLs',
    example: ['https://example.com/image1.jpg'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  images: string[];

  @ApiProperty({
    description: 'Project URL',
    example: 'https://github.com/user/project',
  })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiProperty({
    description: 'Project tags',
    example: ['React', 'Node.js', 'MongoDB'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

class WorkingHourDto {
  @ApiProperty({ description: 'Day of the week', example: 'Monday' })
  @IsString()
  day: string;

  @ApiProperty({ description: 'Start time', example: '09:00' })
  @IsString()
  start: string;

  @ApiProperty({ description: 'End time', example: '17:00' })
  @IsString()
  end: string;
}

class WorkingHoursDto {
  @ApiProperty({ description: 'Timezone', example: 'Asia/Colombo' })
  @IsString()
  timezone: string;

  @ApiProperty({
    description: 'Working hours for each day',
    type: [WorkingHourDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHourDto)
  hours: WorkingHourDto[];
}

export class EditFreelancerProfileDto {
  // Common Profile Fields
  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    description: 'Profile picture URL',
    example: 'https://example.com/profile.jpg',
  })
  @IsUrl()
  @IsOptional()
  profilePicture?: string;

  @ApiProperty({ description: 'Phone number', example: '+94 77 123 4567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Location information' })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiProperty({
    description: 'Languages spoken',
    type: [LanguageDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages?: LanguageDto[];

  // Freelancer Profile Fields
  @ApiProperty({
    description: 'Professional title',
    example: 'Full Stack Developer',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Professional bio',
    example: 'Experienced full stack developer with 5+ years...',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  bio?: string;

  @ApiProperty({
    description: 'Skills',
    example: ['JavaScript', 'React', 'Node.js'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({
    description: 'Experience level',
    example: 'intermediate',
    enum: ['beginner', 'intermediate', 'expert'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'expert'])
  experience?: string;

  @ApiProperty({
    description: 'Education history',
    type: [EducationDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiProperty({
    description: 'Certifications',
    type: [CertificationDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];

  @ApiProperty({
    description: 'Portfolio items',
    type: [PortfolioItemDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PortfolioItemDto)
  portfolio?: PortfolioItemDto[];

  @ApiProperty({ description: 'Hourly rate in USD', example: 50 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  hourlyRate?: number;

  @ApiProperty({
    description: 'Availability status',
    example: 'available',
    enum: ['full-time', 'part-time', 'not-available', 'available'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['full-time', 'part-time', 'not-available', 'available'])
  availability?: string;

  @ApiProperty({ description: 'Working hours' })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto;
}
