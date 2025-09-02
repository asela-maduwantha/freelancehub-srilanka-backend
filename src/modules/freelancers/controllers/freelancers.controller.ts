import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/guards/roles.guard';
import { FreelancersService } from '../services/freelancers.service';

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
}
