import { Controller, Get, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ProposalsService } from '../services/proposals.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('proposals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get('project/:projectId')
  @Roles('client')
  async getProposalsForProject(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    const clientId = req.user.userId;
    return this.proposalsService.getProposalsForProject(projectId, clientId);
  }

  @Get('client')
  @Roles('client')
  async getClientProposals(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const clientId = req.user.userId;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.proposalsService.getClientProposals(clientId, pageNum, limitNum);
  }
}
