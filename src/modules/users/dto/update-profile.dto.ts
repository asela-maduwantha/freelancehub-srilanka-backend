import { IsOptional, IsString, IsEmail, IsPhoneNumber } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsOptional()
  location?: {
    country: string;
    city: string;
    timezone: string;
  };

  @IsOptional()
  languages?: {
    language: string;
    proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
  }[];
}
