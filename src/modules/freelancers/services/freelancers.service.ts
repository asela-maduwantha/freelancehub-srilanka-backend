import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Project, ProjectDocument } from '../../projects/schemas/project.schema';
import { Contract, ContractDocument } from '../../contracts/schemas/contract.schema';
import { Proposal, ProposalDocument } from '../../proposals/schemas/proposal.schema';

@Injectable()
export class FreelancersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(Proposal.name) private proposalModel: Model<ProposalDocument>,
  ) {}

  async getFreelancerDashboard(freelancerId: string) {
    // Get total projects assigned to freelancer
    const totalProjects = await this.projectModel.countDocuments({ freelancerId });

    // Get active projects (in-progress)
    const activeProjects = await this.projectModel.countDocuments({
      freelancerId,
      status: 'in-progress',
    });

    // Get completed projects
    const completedProjects = await this.projectModel.countDocuments({
      freelancerId,
      status: 'completed',
    });

    // Get active contracts
    const activeContracts = await this.contractModel.countDocuments({
      freelancerId,
      status: { $in: ['active', 'in-progress'] },
    });

    // Get total earned (sum of completed contracts budget)
    const totalEarnedResult = await this.contractModel.aggregate([
      { $match: { freelancerId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$terms.budget' } } },
    ]);
    const totalEarned = totalEarnedResult[0]?.total || 0;

    // Get pending proposals count
    const pendingProposals = await this.proposalModel.countDocuments({
      freelancerId,
      status: 'pending',
    });

    // Get recent projects
    const recentProjectsRaw = await this.projectModel
      .find({ freelancerId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status createdAt budget');

    // Transform recent projects
    const recentProjects = recentProjectsRaw.map((project) => ({
      _id: project._id,
      title: project.title,
      status: project.status,
      createdAt: project.createdAt,
      budget: { amount: project.budget },
    }));

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalEarned,
      activeContracts,
      pendingProposals,
      recentProjects,
    };
  }
}
