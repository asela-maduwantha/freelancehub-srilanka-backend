import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateFreelancerProfileDto } from '../dto/update-freelancer-profile.dto';
import { UpdateClientProfileDto } from '../dto/update-client-profile.dto';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        role: { type: 'array', items: { type: 'string' } },
        activeRole: { type: 'string' },
        profilePicture: { type: 'string' },
        freelancerProfile: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            bio: { type: 'string' },
            skills: { type: 'array', items: { type: 'string' } },
            hourlyRate: { type: 'number' },
          },
        },
        clientProfile: {
          type: 'object',
          properties: {
            companyName: { type: 'string' },
            industry: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Profile updated successfully' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            profilePicture: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Put('freelancer-profile')
  @ApiOperation({ summary: 'Update freelancer profile' })
  @ApiResponse({
    status: 200,
    description: 'Freelancer profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Freelancer profile updated successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - user is not a freelancer' })
  async updateFreelancerProfile(@Request() req, @Body() updateFreelancerProfileDto: UpdateFreelancerProfileDto) {
    return this.usersService.updateFreelancerProfile(req.user.userId, updateFreelancerProfileDto);
  }

  @Put('client-profile')
  @ApiOperation({ summary: 'Update client profile' })
  @ApiResponse({
    status: 200,
    description: 'Client profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Client profile updated successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - user is not a client' })
  async updateClientProfile(@Request() req, @Body() updateClientProfileDto: UpdateClientProfileDto) {
    return this.usersService.updateClientProfile(req.user.userId, updateClientProfileDto);
  }

  @Get('freelancers')
  @ApiOperation({ summary: 'Get freelancers with filtering' })
  @ApiQuery({ name: 'skills', required: false, description: 'Filter by skills (comma-separated)' })
  @ApiQuery({ name: 'experience', required: false, description: 'Filter by experience level' })
  @ApiQuery({ name: 'minRate', required: false, description: 'Minimum hourly rate' })
  @ApiQuery({ name: 'maxRate', required: false, description: 'Maximum hourly rate' })
  @ApiQuery({ name: 'availability', required: false, description: 'Filter by availability' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Freelancers retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        freelancers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              profilePicture: { type: 'string' },
              freelancerProfile: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  skills: { type: 'array', items: { type: 'string' } },
                  hourlyRate: { type: 'number' },
                  experience: { type: 'string' },
                },
              },
              stats: {
                type: 'object',
                properties: {
                  avgRating: { type: 'number' },
                  projectsCompleted: { type: 'number' },
                },
              },
            },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getFreelancers(@Query() query: any) {
    return this.usersService.getFreelancers(query);
  }

  @Get('clients')
  @ApiOperation({ summary: 'Get clients' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Clients retrieved successfully',
  })
  async getClients(@Query() query: any) {
    return this.usersService.getClients(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Post(':id/follow')
  @ApiOperation({ summary: 'Follow a user' })
  @ApiParam({ name: 'id', description: 'User ID to follow' })
  @ApiResponse({
    status: 200,
    description: 'User followed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User followed successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Cannot follow yourself' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async followUser(@Request() req, @Param('id') userId: string) {
    return this.usersService.followUser(req.user.userId, userId);
  }

  @Delete(':id/follow')
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiParam({ name: 'id', description: 'User ID to unfollow' })
  @ApiResponse({
    status: 200,
    description: 'User unfollowed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User unfollowed successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unfollowUser(@Request() req, @Param('id') userId: string) {
    return this.usersService.unfollowUser(req.user.userId, userId);
  }

  @Get(':id/followers')
  @ApiOperation({ summary: 'Get user followers' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Followers retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          profilePicture: { type: 'string' },
        },
      },
    },
  })
  async getFollowers(@Param('id') userId: string) {
    return this.usersService.getFollowers(userId);
  }

  @Get(':id/following')
  @ApiOperation({ summary: 'Get users followed by user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Following list retrieved successfully',
  })
  async getFollowing(@Param('id') userId: string) {
    return this.usersService.getFollowing(userId);
  }
}
