import {
  Controller,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
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
  FreelancerDashboardResponseDto 
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
}