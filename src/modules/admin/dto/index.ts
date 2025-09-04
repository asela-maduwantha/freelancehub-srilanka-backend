import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { UserStatus } from '../../../types';

export class UpdateUserStatusDto {
  @IsNotEmpty()
  @IsEnum(['active', 'suspended', 'banned', 'pending', 'inactive'])
  status: 'active' | 'suspended' | 'banned' | 'pending' | 'inactive';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ApproveProjectDto {
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class UpdateSystemSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  platformFee?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxProjectsPerUser?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxProposalsPerProject?: number;

  @IsOptional()
  @IsNumber()
  @Min(1024) // 1KB
  @Max(100 * 1024 * 1024) // 100MB
  maxFileSize?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedFileTypes?: string[];
}

export class GetUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['active', 'suspended', 'banned', 'pending', 'inactive'])
  status?: 'active' | 'suspended' | 'banned' | 'pending' | 'inactive';

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  createdAfter?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
