import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly usersService: UsersService) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get client dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalProjects: { type: 'number' },
        activeProjects: { type: 'number' },
        completedProjects: { type: 'number' },
        totalSpent: { type: 'number' },
        activeContracts: { type: 'number' },
        pendingProposals: { type: 'number' },
        recentProjects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string' },
              budget: {
                type: 'object',
                properties: {
                  amount: { type: 'number' }
                }
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getClientDashboard(@Request() req) {
    return this.usersService.getClientDashboard(req.user.userId);
  }
}
