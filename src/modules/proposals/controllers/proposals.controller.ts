import { Controller, Get, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProposalsService } from '../services/proposals.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/guards/roles.guard';
import { AuthenticatedRequest } from '../../../common/interfaces/pagination.interface';

@ApiTags('proposals')
@Controller('proposals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  // Note: Removed duplicate endpoints that exist in other controllers
  // - /proposals/project/:projectId -> Use /projects/:id/proposals instead
  // - /proposals/client -> Use /clients/proposals instead
  
  @Get('my')
  @Roles('freelancer')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my proposals as freelancer' })
  @ApiResponse({
    status: 200,
    description: 'User proposals retrieved successfully',
  })
  async getMyProposals(
    @Request() req: AuthenticatedRequest,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
  ) {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
    return this.proposalsService.getUserProposals(req.user.userId);
  }
}
