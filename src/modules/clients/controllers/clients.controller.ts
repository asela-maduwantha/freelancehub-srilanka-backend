import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  Param,
  Post,
  Body,
} from '@nestjs/common';
import { ProposalsService } from '../../proposals/services/proposals.service';
import { ProjectsService } from '../../projects/services/projects.service';
import { ClientsService } from '../services/clients.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AcceptProposalDto } from '../../proposals/dto/accept-proposal.dto';
import { AuthenticatedRequest } from '../../../common/interfaces/pagination.interface';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly projectsService: ProjectsService,
    private readonly clientsService: ClientsService,
  ) {}

  @Get('projects')
  @Roles('client')
  async getClientProjects(
    @Request() req: AuthenticatedRequest,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
  ) {
    const clientId = req.user.userId;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const query: { page: number; limit: number; status?: string } = {
      page: pageNum,
      limit: limitNum,
    };
    if (status) {
      query.status = status;
    }
    return this.projectsService.getClientProjects(clientId, query);
  }

  @Get('projects/:id')
  @Roles('client')
  async getClientProjectById(
    @Request() req: AuthenticatedRequest,
    @Param('id') projectId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
  ) {
    const clientId = req.user.userId;

    // Handle special case for "my-projects" - redirect to get all client projects
    if (projectId === 'my-projects') {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const query: { page: number; limit: number; status?: string } = {
        page: pageNum,
        limit: limitNum,
      };
      if (status) {
        query.status = status;
      }
      return this.projectsService.getClientProjects(clientId, query);
    }

    return this.projectsService.getClientProjectById(clientId, projectId);
  }

  @Get('proposals')
  @Roles('client')
  async getClientProposals(
    @Request() req: AuthenticatedRequest,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const clientId = req.user.userId;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.proposalsService.getClientProposals(
      clientId,
      pageNum,
      limitNum,
    );
  }

  @Get('projects/:projectId/proposals')
  @Roles('client')
  async getProposalsForProject(
    @Request() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ) {
    const clientId = req.user.userId;
    return this.proposalsService.getProposalsForProject(projectId, clientId);
  }

  @Post('projects/:projectId/proposals/:proposalId/accept')
  @Roles('client')
  async acceptProposal(
    @Request() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('proposalId') proposalId: string,
    @Body() acceptProposalDto: AcceptProposalDto,
  ) {
    const clientId = req.user.userId;
    return this.proposalsService.acceptProposal(
      proposalId,
      clientId,
      acceptProposalDto,
      projectId,
    );
  }

  @Get('dashboard')
  @Roles('client')
  async getClientDashboard(@Request() req: AuthenticatedRequest) {
    const clientId = req.user.userId;
    return this.clientsService.getClientDashboard(clientId);
  }
}
