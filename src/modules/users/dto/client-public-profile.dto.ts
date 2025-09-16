import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/user-role.enum';

export class ClientPublicProfileDto {
  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.CLIENT,
  })
  role: UserRole;

  @ApiProperty({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  avatar?: string;

  @ApiProperty({
    description: 'User location',
    example: 'New York, USA',
    required: false,
  })
  location?: string;

  @ApiProperty({
    description: 'User bio',
    example: 'Experienced project manager with 10+ years in tech industry',
    required: false,
  })
  bio?: string;

  @ApiProperty({
    description: 'Company name',
    example: 'Tech Solutions Inc.',
    required: false,
  })
  companyName?: string;

  @ApiProperty({
    description: 'Company size',
    example: '51-200',
    enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
    required: false,
  })
  companySize?: string;

  @ApiProperty({
    description: 'Industry',
    example: 'Technology',
    required: false,
  })
  industry?: string;

  @ApiProperty({
    description: 'Client rating',
    example: 4.6,
    required: false,
  })
  rating?: number;

  @ApiProperty({
    description: 'Number of reviews',
    example: 15,
    required: false,
  })
  reviewCount?: number;

  @ApiProperty({
    description: 'Total amount spent',
    example: 75000,
    required: false,
  })
  totalSpent?: number;

  @ApiProperty({
    description: 'Number of jobs posted',
    example: 25,
    required: false,
  })
  postedJobs?: number;
}
