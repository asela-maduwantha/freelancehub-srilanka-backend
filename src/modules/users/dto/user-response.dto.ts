import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/user-role.enum';

export class UserProfileResponseDto {
  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  avatar?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  dateOfBirth?: Date;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'] })
  gender?: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional()
  location?: {
    country?: string;
    state?: string;
    city?: string;
    timezone?: string;
  };

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  socialLinks?: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
}

export class FreelancerDataResponseDto {
  @ApiProperty({ type: [String] })
  skills: string[];

  @ApiPropertyOptional()
  hourlyRate?: number;

  @ApiPropertyOptional({ enum: ['full-time', 'part-time', 'contract'] })
  availability?: string;

  @ApiPropertyOptional({ enum: ['beginner', 'intermediate', 'expert'] })
  experience?: string;

  @ApiProperty({ type: Array })
  languages?: any[];

  @ApiProperty({ type: Array })
  education?: any[];

  @ApiProperty({ type: Array })
  certifications?: any[];

  @ApiProperty({ type: Array })
  portfolio?: any[];

  @ApiProperty()
  totalEarned: number;

  @ApiProperty()
  completedJobs: number;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  reviewCount: number;
}

export class ClientDataResponseDto {
  @ApiPropertyOptional()
  companyName?: string;

  @ApiPropertyOptional({ enum: ['1-10', '11-50', '51-200', '201-500', '500+'] })
  companySize?: string;

  @ApiPropertyOptional()
  industry?: string;

  @ApiProperty()
  totalSpent: number;

  @ApiProperty()
  postedJobs: number;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  reviewCount: number;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  isEmailVerified: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional({ type: UserProfileResponseDto })
  profile?: UserProfileResponseDto;

  @ApiPropertyOptional({ type: FreelancerDataResponseDto })
  freelancerData?: FreelancerDataResponseDto;

  @ApiPropertyOptional({ type: ClientDataResponseDto })
  clientData?: ClientDataResponseDto;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  lastLoginAt?: Date;

  @ApiProperty()
  fullName: string;
}

export class UsersListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  users: UserResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class MessageResponseDto {
  @ApiProperty()
  message: string;
}
