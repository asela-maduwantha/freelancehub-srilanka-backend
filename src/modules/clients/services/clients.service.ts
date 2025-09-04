import { Injectable } from '@nestjs/common';
import { ProposalsService } from '../../proposals/services/proposals.service';
import { ProjectsService } from '../../projects/services/projects.service';

@Injectable()
export class ClientsService {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly projectsService: ProjectsService,
  ) {}

  async getClientDashboard(clientId: string) {
    // Get all projects for the client
    const allProjects = await this.projectsService.getClientProjects(clientId, {
      page: 1,
      limit: 1000,
    });

    // Get all proposals for the client
    const allProposals = await this.proposalsService.getClientProposals(
      clientId,
      1,
      1000,
    );

    // Calculate dashboard stats
    const totalProjects = allProjects.pagination.total;
    const projectsByStatus = {
      open: 0,
      'in-progress': 0,
      completed: 0,
      cancelled: 0,
      disputed: 0,
    };

    allProjects.projects.forEach((project: any) => {
      if (projectsByStatus.hasOwnProperty(project.status)) {
        projectsByStatus[project.status]++;
      }
    });

    const totalProposals = allProposals.total;

    // Get recent projects (last 5)
    const recentProjects = allProjects.projects.slice(0, 5);

    return {
      totalProjects,
      projectsByStatus,
      totalProposals,
      recentProjects,
    };
  }
}
