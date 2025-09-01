import { IsOptional, IsString, IsEmail, IsPhoneNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'The first name of the user', example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'The last name of the user', example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'The email address of the user', example: 'john.doe@example.com', format: 'email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'The phone number of the user', example: '+1234567890' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ description: 'The URL of the user\'s profile picture', example: 'https://example.com/picture.jpg' })
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @ApiPropertyOptional({ description: 'The location of the user', type: 'object', properties: { country: { type: 'string', example: 'USA' }, city: { type: 'string', example: 'New York' }, timezone: { type: 'string', example: 'EST' } } })
  @IsOptional()
  location?: {
    country: string;
    city: string;
    timezone: string;
  };

  @ApiPropertyOptional({ description: 'The languages spoken by the user', type: 'array', items: { type: 'object', properties: { language: { type: 'string', example: 'English' }, proficiency: { type: 'string', enum: ['basic', 'conversational', 'fluent', 'native'], example: 'fluent' } } } })
  @IsOptional()
  languages?: {
    language: string;
    proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
  }[];
}
