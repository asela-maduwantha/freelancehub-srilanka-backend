// src/modules/users/dto/add-education.dto.ts
import { IsNotEmpty, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddEducationDto {
  @ApiProperty({
    description: 'Degree or qualification obtained',
    example: 'Bachelor of Science in Computer Science',
  })
  @IsNotEmpty()
  @IsString()
  degree: string;

  @ApiProperty({
    description: 'Educational institution name',
    example: 'University of Technology',
  })
  @IsNotEmpty()
  @IsString()
  institution: string;

  @ApiProperty({
    description: 'Year of graduation or completion',
    example: 2020,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 10) // Allow future years for current students
  year: number;
}