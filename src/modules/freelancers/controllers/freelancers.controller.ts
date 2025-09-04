import { Controller, Get, Post, Put, UseGuards, Request, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/guards/roles.guard';
import { FreelancersService } from '../services/freelancers.service';
import { EditFreelancerProfileType, FreelancerProfileResponse } from '../types/freelancer-profile.types';
import { CreateFreelancerProfileDto, UpdateFreelancerProfileDto } from '../../../dto/freelancer-profile.dto';

@ApiTags('freelancers')
@Controller('freelancers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('freelancer')
export class FreelancersController {
  constructor(private readonly freelancersService: FreelancersService) {}

  @Get('dashboard')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get freelancer dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Freelancer dashboard data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalProjects: { type: 'number', example: 15 },
        activeProjects: { type: 'number', example: 5 },
        completedProjects: { type: 'number', example: 10 },
        totalEarned: { type: 'number', example: 25000 },
        activeContracts: { type: 'number', example: 3 },
        pendingProposals: { type: 'number', example: 7 },
        recentProjects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              budget: {
                type: 'object',
                properties: {
                  amount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a freelancer' })
  async getFreelancerDashboard(@Request() req: any) {
    const freelancerId = req.user.userId;
    return this.freelancersService.getFreelancerDashboard(freelancerId);
  }

  @Post('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create freelancer profile' })
  @ApiResponse({
    status: 201,
    description: 'Profile created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { type: 'object' },
        message: { type: 'string', example: 'Profile created successfully' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - profile already exists or invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a freelancer' })
  async createProfile(
    @Request() req: any,
    @Body() createData: CreateFreelancerProfileDto,
  ): Promise<FreelancerProfileResponse> {
    const freelancerId = req.user.userId;
    const profile = await this.freelancersService.createProfile(freelancerId, createData);

    return {
      success: true,
      data: profile as any,
      message: 'Profile created successfully'
    };
  }

  @Put('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update freelancer profile',
    description: 'Update the authenticated freelancer\'s profile information. All fields are optional for partial updates.'
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { type: 'object' },
        message: { type: 'string', example: 'Profile updated successfully' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a freelancer' })
  @ApiResponse({ status: 404, description: 'Freelancer not found' })
  async updateProfile(
    @Request() req: any,
    @Body() updateData: UpdateFreelancerProfileDto,
  ): Promise<FreelancerProfileResponse> {
    const freelancerId = req.user.userId;
    const updatedProfile = await this.freelancersService.updateProfile(freelancerId, updateData);

    return {
      success: true,
      data: updatedProfile as any, // Type casting to resolve schema vs types incompatibility
      message: 'Profile updated successfully'
    };
  }
}
