import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
} from '@nestjs/common';
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
import { AdminService } from '../services/admin.service';
import {
  UpdateUserStatusDto,
  ApproveProjectDto,
  UpdateSystemSettingsDto,
  GetUsersQueryDto,
} from '../dto';
import { RolesGuard, Roles } from '../../../common/guards/roles.guard';
import { RateLimit } from '../../../common/guards/rate-limit.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserRole } from '../../../types';

interface PlatformFees {
  platformFee: number;
  paymentProcessingFee: number;
  currency: string;
}

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard Statistics
  @Get('dashboard/stats')
  @RateLimit({ requests: 30, windowMs: 60000 }) // 30 requests per minute for stats
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes cache for admin stats
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalUsers: { type: 'number' },
        totalProjects: { type: 'number' },
        totalContracts: { type: 'number' },
        totalRevenue: { type: 'number' },
        activeUsers: { type: 'number' },
        pendingProjects: { type: 'number' },
        disputedContracts: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('stats/revenue')
  @RateLimit({ requests: 20, windowMs: 60000 }) // 20 requests per minute for revenue stats
  @ApiOperation({ summary: 'Get revenue statistics' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year'], description: 'Time period for statistics' })
  @ApiResponse({
    status: 200,
    description: 'Revenue statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        period: { type: 'string' },
        totalRevenue: { type: 'number' },
        platformFees: { type: 'number' },
        paymentProcessingFees: { type: 'number' },
        netRevenue: { type: 'number' },
        currency: { type: 'string' },
      },
    },
  })
  async getRevenueStats(@Query('period') period: string = 'month') {
    return this.adminService.getRevenueStats(period);
  }

  @Get('stats/users')
  @RateLimit({ requests: 20, windowMs: 60000 }) // 20 requests per minute for user stats
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalUsers: { type: 'number' },
        activeUsers: { type: 'number' },
        newUsersThisMonth: { type: 'number' },
        freelancersCount: { type: 'number' },
        clientsCount: { type: 'number' },
        userGrowthRate: { type: 'number' },
      },
    },
  })
  async getUserStats() {
    return this.adminService.getUserStats();
  }

  // User Management
  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: 'number', description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Items per page' })
  @ApiQuery({ name: 'role', required: false, enum: ['freelancer', 'client'], description: 'Filter by user role' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive', 'suspended'], description: 'Filter by user status' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              role: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              lastLogin: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getAllUsers(@Query() query: GetUsersQueryDto) {
    return this.adminService.getAllUsers(query, {
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get detailed user information' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        role: { type: 'string' },
        status: { type: 'string' },
        profile: { type: 'object' },
        stats: {
          type: 'object',
          properties: {
            totalProjects: { type: 'number' },
            completedProjects: { type: 'number' },
            totalEarnings: { type: 'number' },
            averageRating: { type: 'number' },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        lastLogin: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetails(@Param('id') userId: string) {
    return this.adminService.getUserDetails(userId);
  }

  @Put('users/:id/status')
  @RateLimit({ requests: 10, windowMs: 300000 }) // 10 status changes per 5 minutes
  @ApiOperation({ summary: 'Update user status (critical admin action)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User status updated successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
    @Request() req,
  ) {
    // Enhanced audit logging for critical admin action
    console.log(`[ADMIN_AUDIT] Admin ${req.user.userId} (${req.user.email}) updating user ${userId} status to ${updateUserStatusDto.status} at ${new Date().toISOString()}`);
    return this.adminService.updateUserStatus(userId, updateUserStatusDto);
  }

  // Content Moderation
  @Get('projects/pending')
  @ApiOperation({ summary: 'Get pending projects for approval' })
  @ApiResponse({
    status: 200,
    description: 'Pending projects retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          budget: { type: 'number' },
          status: { type: 'string', example: 'pending' },
          client: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getPendingProjects() {
    return this.adminService.getPendingProjects();
  }

  @Post('projects/:id/approve')
  @RateLimit({ requests: 20, windowMs: 300000 }) // 20 approvals per 5 minutes
  @ApiOperation({ summary: 'Approve pending project (admin action)' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project approved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Project approved successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async approveProject(
    @Param('id') projectId: string,
    @Body() approveProjectDto: ApproveProjectDto,
    @Request() req,
  ) {
    console.log(`[ADMIN_AUDIT] Admin ${req.user.userId} approved project ${projectId} at ${new Date().toISOString()}`);
    return this.adminService.approveProject(projectId, approveProjectDto);
  }

  @Post('projects/:id/reject')
  @RateLimit({ requests: 20, windowMs: 300000 }) // 20 rejections per 5 minutes
  @ApiOperation({ summary: 'Reject pending project (admin action)' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Reason for rejection' },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Project rejected successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Project rejected successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async rejectProject(
    @Param('id') projectId: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    console.log(`[ADMIN_AUDIT] Admin ${req.user.userId} rejected project ${projectId} with reason: ${reason} at ${new Date().toISOString()}`);
    return this.adminService.rejectProject(projectId, reason);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get reported content' })
  @ApiResponse({
    status: 200,
    description: 'Reported content retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['project', 'user', 'review'] },
          contentId: { type: 'string' },
          reason: { type: 'string' },
          reporter: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
          },
          status: { type: 'string', enum: ['pending', 'resolved', 'dismissed'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getReportedContent() {
    return this.adminService.getReportedContent();
  }

  // System Configuration
  @Get('settings')
  @ApiOperation({ summary: 'Get system settings' })
  @ApiResponse({
    status: 200,
    description: 'System settings retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        platformFee: { type: 'number' },
        paymentProcessingFee: { type: 'number' },
        maxFileSize: { type: 'number' },
        allowedFileTypes: { type: 'array', items: { type: 'string' } },
        maintenanceMode: { type: 'boolean' },
        emailNotifications: { type: 'boolean' },
      },
    },
  })
  async getSystemSettings() {
    return this.adminService.getSystemSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update system settings' })
  @ApiResponse({
    status: 200,
    description: 'System settings updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'System settings updated successfully' },
      },
    },
  })
  async updateSystemSettings(@Body() updateSystemSettingsDto: UpdateSystemSettingsDto) {
    return this.adminService.updateSystemSettings(updateSystemSettingsDto);
  }

  // Additional Admin Endpoints
  @Get('categories')
  @ApiOperation({ summary: 'Get available project categories' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async getCategories() {
    // Return available categories - in real app, this would be from database
    return [
      'Web Development',
      'Mobile Development',
      'Design',
      'Writing',
      'Marketing',
      'Data Science',
      'DevOps',
      'Consulting',
    ];
  }

  @Put('categories')
  @ApiOperation({ summary: 'Update project categories' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['categories'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Categories updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Categories updated successfully' },
        categories: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async updateCategories(@Body('categories') categories: string[]) {
    // In real app, save to database
    return categories;
  }

  @Get('skills')
  @ApiOperation({ summary: 'Get available skills' })
  @ApiResponse({
    status: 200,
    description: 'Skills retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        skills: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async getSkills() {
    // Return available skills - in real app, this would be from database
    return [
      'JavaScript',
      'TypeScript',
      'React',
      'Node.js',
      'Python',
      'Java',
      'C#',
      'PHP',
      'HTML/CSS',
      'SQL',
      'MongoDB',
      'AWS',
      'Docker',
      'Kubernetes',
    ];
  }

  @Put('skills')
  @ApiOperation({ summary: 'Update available skills' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        skills: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['skills'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Skills updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Skills updated successfully' },
        skills: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async updateSkills(@Body('skills') skills: string[]) {
    // In real app, save to database
    return skills;
  }

  @Get('fees')
  @ApiOperation({ summary: 'Get platform fees configuration' })
  @ApiResponse({
    status: 200,
    description: 'Platform fees retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        platformFee: { type: 'number', description: 'Platform fee percentage' },
        paymentProcessingFee: { type: 'number', description: 'Payment processing fee percentage' },
        currency: { type: 'string' },
      },
    },
  })
  async getPlatformFees() {
    return {
      platformFee: 10, // 10%
      paymentProcessingFee: 2.9, // 2.9%
      currency: 'USD',
    };
  }

  @Put('fees')
  @ApiOperation({ summary: 'Update platform fees' })
  @ApiResponse({
    status: 200,
    description: 'Platform fees updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Platform fees updated successfully' },
        fees: { type: 'object' },
      },
    },
  })
  async updatePlatformFees(@Body() fees: PlatformFees) {
    // In real app, save to database and update Stripe
    return fees;
  }

  // Analytics endpoints
  @Get('analytics/projects')
  @ApiOperation({ summary: 'Get project analytics' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year'], description: 'Time period for analytics' })
  @ApiResponse({
    status: 200,
    description: 'Project analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        period: { type: 'string' },
        totalProjects: { type: 'number' },
        activeProjects: { type: 'number' },
        completedProjects: { type: 'number' },
        cancelledProjects: { type: 'number' },
        averageBudget: { type: 'number' },
        popularCategories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getProjectAnalytics(@Query('period') period: string = 'month') {
    // Return project analytics - in real app, this would aggregate from database
    return {
      period,
      totalProjects: 150,
      activeProjects: 45,
      completedProjects: 89,
      cancelledProjects: 16,
      averageBudget: 1250,
      popularCategories: [
        { category: 'Web Development', count: 45 },
        { category: 'Mobile Development', count: 32 },
        { category: 'Design', count: 28 },
      ],
    };
  }

  @Get('analytics/contracts')
  @ApiOperation({ summary: 'Get contract analytics' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year'], description: 'Time period for analytics' })
  @ApiResponse({
    status: 200,
    description: 'Contract analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        period: { type: 'string' },
        totalContracts: { type: 'number' },
        activeContracts: { type: 'number' },
        completedContracts: { type: 'number' },
        disputedContracts: { type: 'number' },
        averageDuration: { type: 'number', description: 'Average duration in days' },
        averageValue: { type: 'number' },
        successRate: { type: 'number', description: 'Success rate percentage' },
      },
    },
  })
  async getContractAnalytics(@Query('period') period: string = 'month') {
    return {
      period,
      totalContracts: 120,
      activeContracts: 35,
      completedContracts: 75,
      disputedContracts: 10,
      averageDuration: 25, // days
      averageValue: 2100,
      successRate: 85, // percentage
    };
  }

  @Get('analytics/payments')
  @ApiOperation({ summary: 'Get payment analytics' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year'], description: 'Time period for analytics' })
  @ApiResponse({
    status: 200,
    description: 'Payment analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        period: { type: 'string' },
        totalPayments: { type: 'number' },
        totalVolume: { type: 'number' },
        averagePayment: { type: 'number' },
        paymentMethods: {
          type: 'object',
          properties: {
            stripe: { type: 'number' },
            paypal: { type: 'number' },
          },
        },
        currency: { type: 'string' },
      },
    },
  })
  async getPaymentAnalytics(@Query('period') period: string = 'month') {
    return {
      period,
      totalPayments: 95,
      totalVolume: 185000,
      averagePayment: 1947,
      paymentMethods: {
        stripe: 85,
        paypal: 10,
      },
      currency: 'USD',
    };
  }
}
