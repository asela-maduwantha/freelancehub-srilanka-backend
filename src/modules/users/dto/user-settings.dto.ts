import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, IsIn } from 'class-validator';

export class UserSettingsDto {
  @ApiPropertyOptional({
    description: 'Email notifications enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Profile visibility',
    enum: ['public', 'private', 'freelancers_only'],
    example: 'public',
  })
  @IsOptional()
  @IsIn(['public', 'private', 'freelancers_only'])
  profileVisibility?: string;

  @ApiPropertyOptional({
    description: 'Language preference',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Timezone',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Two-factor authentication enabled',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;
}

export class UserSettingsResponseDto {
  @ApiPropertyOptional({
    description: 'Email notifications enabled',
    example: true,
  })
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Profile visibility',
    enum: ['public', 'private', 'freelancers_only'],
    example: 'public',
  })
  profileVisibility?: string;

  @ApiPropertyOptional({
    description: 'Language preference',
    example: 'en',
  })
  language?: string;

  @ApiPropertyOptional({
    description: 'Timezone',
    example: 'America/New_York',
  })
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Two-factor authentication enabled',
    example: false,
  })
  twoFactorEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Account active status',
    example: true,
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Email verified status',
    example: true,
  })
  isEmailVerified?: boolean;
}