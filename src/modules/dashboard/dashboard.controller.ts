import {
  Controller,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { 
  ClientDashboardResponseDto,
  FreelancerDashboardResponseDto,
  ChartDataDto,
  ChartDataResponseDto,
  ActivityFeedResponseDto,
  QuickStatsResponseDto,
  DeadlinesResponseDto,
} from './dto';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('client')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Get client dashboard data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client dashboard data retrieved successfully',
    type: ClientDashboardResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - User must be a client',
  })
  async getClientDashboard(
    @CurrentUser('id') clientId: string,
  ): Promise<ClientDashboardResponseDto> {
    return this.dashboardService.getClientDashboard(clientId);
  }

  @Get('freelancer')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.FREELANCER)
  @ApiOperation({ summary: 'Get freelancer dashboard data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Freelancer dashboard data retrieved successfully',
    type: FreelancerDashboardResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - User must be a freelancer',
  })
  async getFreelancerDashboard(
    @CurrentUser('id') freelancerId: string,
  ): Promise<FreelancerDashboardResponseDto> {
    return this.dashboardService.getFreelancerDashboard(freelancerId);
  }

  @Get('analytics/charts')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CLIENT, UserRole.FREELANCER)
  @ApiOperation({ summary: 'Get chart data for analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chart data retrieved successfully',
    type: ChartDataResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getChartData(
    @CurrentUser('id') userId: string,
    @Query() dto: ChartDataDto,
  ): Promise<ChartDataResponseDto> {
    return this.dashboardService.getChartData(userId, dto);
  }

  @Get('analytics/recent-activity')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CLIENT, UserRole.FREELANCER)
  @ApiOperation({ summary: 'Get recent activity feed' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Activity feed retrieved successfully',
    type: ActivityFeedResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getRecentActivity(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ActivityFeedResponseDto> {
    return this.dashboardService.getRecentActivity(userId, page, limit);
  }

  @Get('analytics/quick-stats')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CLIENT, UserRole.FREELANCER)
  @ApiOperation({ summary: 'Get quick statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quick stats retrieved successfully',
    type: QuickStatsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getQuickStats(
    @CurrentUser('id') userId: string,
  ): Promise<QuickStatsResponseDto> {
    return this.dashboardService.getQuickStats(userId);
  }

  @Get('analytics/upcoming-deadlines')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CLIENT, UserRole.FREELANCER)
  @ApiOperation({ summary: 'Get upcoming deadlines' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Upcoming deadlines retrieved successfully',
    type: DeadlinesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getUpcomingDeadlines(
    @CurrentUser('id') userId: string,
  ): Promise<DeadlinesResponseDto> {
    return this.dashboardService.getUpcomingDeadlines(userId);
  }
}