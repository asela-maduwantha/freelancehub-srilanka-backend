import { IsOptional, IsString, IsEnum, IsUrl, IsBoolean } from 'class-validator';

export class UpdateClientProfileDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsEnum(['1-10', '11-50', '51-200', '200+'])
  companySize?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}
