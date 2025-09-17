import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/user-role.enum';

export class FreelancerPublicProfileDto {
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
    example: UserRole.FREELANCER,
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
    example: 'Experienced web developer with 5+ years of experience',
    required: false,
  })
  bio?: string;

  @ApiProperty({
    description: 'Freelancer skills',
    example: ['JavaScript', 'React', 'Node.js'],
    type: [String],
    required: false,
  })
  skills?: string[];

  @ApiProperty({
    description: 'Freelancer hourly rate',
    example: 75,
    required: false,
  })
  hourlyRate?: number;

  @ApiProperty({
    description: 'Freelancer rating',
    example: 4.8,
    required: false,
  })
  rating?: number;

  @ApiProperty({
    description: 'Number of reviews',
    example: 25,
    required: false,
  })
  reviewCount?: number;

  @ApiProperty({
    description: 'Total earnings',
    example: 50000,
    required: false,
  })
  totalEarned?: number;

  @ApiProperty({
    description: 'Completed jobs count',
    example: 50,
    required: false,
  })
  completedJobs?: number;

  @ApiProperty({
    description: 'Portfolio items',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'E-commerce Website' },
        description: {
          type: 'string',
          example: 'Built a full-stack e-commerce platform',
        },
        url: { type: 'string', example: 'https://example.com/portfolio/1' },
        technologies: {
          type: 'array',
          items: { type: 'string' },
          example: ['React', 'Node.js'],
        },
      },
    },
    required: false,
  })
  portfolio?: any[];

  @ApiProperty({
    description: 'Education records',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        institution: { type: 'string', example: 'University of Technology' },
        degree: { type: 'string', example: 'Bachelor of Computer Science' },
        year: { type: 'number', example: 2020 },
      },
    },
    required: false,
  })
  education?: any[];

  @ApiProperty({
    description: 'Certifications',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'AWS Certified Developer' },
        issuer: { type: 'string', example: 'Amazon Web Services' },
        date: { type: 'string', format: 'date', example: '2023-01-15' },
        url: {
          type: 'string',
          example: 'https://aws.amazon.com/certification',
        },
      },
    },
    required: false,
  })
  certifications?: any[];
}

export class FreelancersSearchResponseDto {
  @ApiProperty({
    description: 'Array of freelancer profiles',
    type: [FreelancerPublicProfileDto],
  })
  freelancers: FreelancerPublicProfileDto[];

  @ApiProperty({
    description: 'Total number of freelancers matching the search',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of results per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 15,
  })
  totalPages: number;
}
