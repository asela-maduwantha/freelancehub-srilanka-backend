import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, UseInterceptors, ForbiddenException } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
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
import { UserAnalyticsService } from '../services/user-analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/guards/roles.guard';
import { RateLimit } from '../../../common/guards/rate-limit.guard';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateFreelancerProfileDto } from '../dto/update-freelancer-profile.dto';
import { UpdateClientProfileDto } from '../dto/update-client-profile.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userAnalyticsService: UserAnalyticsService,
  ) {}

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @RateLimit({ requests: 10, windowMs: 60000 }) // 10 updates per minute
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
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
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
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
        data: {
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
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            pages: { type: 'number' },
          },
        },
      },
    },
  })
  async getFreelancers(@Query() query: any) {
    return this.usersService.getFreelancers(query);
  }

  @Get('clients')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('self', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string, @Request() req) {
    return this.usersService.getUserById(id);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
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

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get user analytics' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        overview: {
          type: 'object',
          properties: {
            totalProjects: { type: 'number' },
            activeProjects: { type: 'number' },
            completedProjects: { type: 'number' },
            completionRate: { type: 'number' },
            avgRating: { type: 'number' },
          },
        },
        financial: {
          type: 'object',
          properties: {
            totalEarnings: { type: 'number' },
            totalSpent: { type: 'number' },
            monthlyEarnings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'string' },
                  amount: { type: 'number' },
                },
              },
            },
          },
        },
        engagement: {
          type: 'object',
          properties: {
            profileViews: { type: 'number' },
            profileCompletion: { type: 'number' },
            responseRate: { type: 'number' },
            responseTime: { type: 'number' },
          },
        },
        performance: {
          type: 'object',
          properties: {
            onTimeDelivery: { type: 'number' },
            clientSatisfaction: { type: 'number' },
            repeatClients: { type: 'number' },
          },
        },
        trends: {
          type: 'object',
          properties: {
            ratingTrend: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  rating: { type: 'number' },
                },
              },
            },
            activityTrend: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  count: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserAnalytics(@Request() req, @Param('id') userId: string) {
    // Users can only view their own analytics
    if (req.user.userId !== userId) {
      throw new ForbiddenException('You can only view your own analytics');
    }

    const analytics = await this.userAnalyticsService.calculateUserAnalytics(userId);
    return {
      overview: {
        totalProjects: analytics.totalProjects,
        activeProjects: analytics.activeProjects,
        completedProjects: analytics.completedProjects,
        completionRate: analytics.completionRate,
        avgRating: analytics.avgRating,
      },
      financial: {
        totalEarnings: analytics.totalEarnings,
        totalSpent: analytics.totalSpent,
        monthlyEarnings: analytics.monthlyEarnings,
      },
      engagement: {
        profileViews: analytics.profileViews,
        profileCompletion: analytics.profileCompletion,
        responseRate: analytics.responseRate,
        responseTime: analytics.responseTime,
      },
      performance: {
        onTimeDelivery: analytics.onTimeDelivery,
        clientSatisfaction: analytics.clientSatisfaction,
        repeatClients: analytics.repeatClients,
      },
      trends: {
        ratingTrend: analytics.ratingTrend,
        activityTrend: analytics.activityTrend,
      },
    };
  }

  @Get(':id/analytics/freelancer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get freelancer-specific analytics' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Freelancer analytics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User is not a freelancer' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getFreelancerAnalytics(@Request() req, @Param('id') userId: string) {
    // Users can only view their own analytics
    if (req.user.userId !== userId) {
      throw new ForbiddenException('You can only view your own analytics');
    }

    const analytics = await this.userAnalyticsService.calculateFreelancerAnalytics(userId);
    return analytics;
  }

  @Get(':id/analytics/client')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get client-specific analytics' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Client analytics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User is not a client' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getClientAnalytics(@Request() req, @Param('id') userId: string) {
    // Users can only view their own analytics
    if (req.user.userId !== userId) {
      throw new ForbiddenException('You can only view your own analytics');
    }

    const analytics = await this.userAnalyticsService.calculateClientAnalytics(userId);
    return analytics;
  }
}
