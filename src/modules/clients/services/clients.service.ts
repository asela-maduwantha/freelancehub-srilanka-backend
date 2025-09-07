import { Injectable } from '@nestjs/common';
import { ProposalsService } from '../../proposals/services/proposals.service';
import { ProjectsService } from '../../projects/services/projects.service';
import { ContractsService } from '../../contracts/services/contracts.service';

@Injectable()
export class ClientsService {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly projectsService: ProjectsService,
    private readonly contractsService: ContractsService,
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

    // Get latest submitted proposals for the client
    const submittedProposals = await this.proposalsService.getClientProposals(
      clientId,
      1,
      10,
      'submitted',
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
      latestProposals: submittedProposals.proposals,
    };
  }

  async getClientSubmittedMilestonesGroupedByProjects(clientId: string) {
    // Get all contracts for the client
    const contracts = await this.contractsService.getUserContracts(clientId);

    // Filter contracts where the user is the client
    const clientContracts = contracts.filter(
      (contract: any) => contract.clientId._id.toString() === clientId,
    );

    // Group milestones by project
    const projectsWithSubmittedMilestones = {};

    clientContracts.forEach((contract: any) => {
      const projectId = contract.projectId._id.toString();
      const projectTitle = contract.projectId.title;

      if (!projectsWithSubmittedMilestones[projectId]) {
        projectsWithSubmittedMilestones[projectId] = {
          projectId,
          projectTitle,
          submittedMilestones: [],
        };
      }

      // Filter submitted milestones
      const submittedMilestones = contract.milestones.filter(
        (milestone: any) => milestone.status === 'submitted',
      );

      if (submittedMilestones.length > 0) {
        projectsWithSubmittedMilestones[projectId].submittedMilestones.push(
          ...submittedMilestones.map((milestone: any) => ({
            ...milestone.toObject(),
            contractId: contract._id,
            contractTitle: contract.title,
          })),
        );
      }
    });

    // Convert to array and filter out projects with no submitted milestones
    const result = Object.values(projectsWithSubmittedMilestones).filter(
      (project: any) => project.submittedMilestones.length > 0,
    );

    return result;
  }
}
