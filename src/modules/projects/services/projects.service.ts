import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from '../schemas/project.schema';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { SubmitProposalDto } from '../dto/submit-proposal.dto';
import { UsersService } from '../../users/services/users.service';
import { EmailService } from '../../../common/services/email.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private usersService: UsersService,
    private emailService: EmailService,
  ) {}

  async createProject(clientId: string, createProjectDto: CreateProjectDto): Promise<Project> {
    const user = await this.usersService.getUserById(clientId);
    if (!user.role.includes('client')) {
      throw new ForbiddenException('Only clients can create projects');
    }

    const project = new this.projectModel({
      ...createProjectDto,
      clientId,
      requiredSkills: createProjectDto.requiredSkills.map(skill => ({ skill, level: 'intermediate' })),
      analytics: { views: 0, applications: 0, saves: 0 },
    });

    return project.save();
  }

  async getProjects(query: any) {
    const {
      page = 1,
      limit = 10,
      status = 'open',
      skills,
      budgetType,
      minBudget,
      maxBudget,
      experienceLevel,
      workType,
      sortBy = 'postedAt',
      sortOrder = 'desc'
    } = query;

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (skills) {
      const skillArray = skills.split(',');
      filter['requiredSkills.skill'] = { $in: skillArray };
    }

    if (budgetType) {
      filter.budgetType = budgetType;
    }

    if (minBudget || maxBudget) {
      filter.budget = {};
      if (minBudget) filter.budget.$gte = Number(minBudget);
      if (maxBudget) filter.budget.$lte = Number(maxBudget);
    }

    if (experienceLevel) {
      filter.experienceLevel = experienceLevel;
    }

    if (workType) {
      filter.workType = { $in: workType.split(',') };
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const projects = await this.projectModel
      .find(filter)
      .populate('clientId', 'firstName lastName profilePicture clientProfile')
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await this.projectModel.countDocuments(filter);

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getProjectById(projectId: string): Promise<Project> {
    const project = await this.projectModel
      .findById(projectId)
      .populate('clientId', 'firstName lastName profilePicture clientProfile')
      .populate('freelancerId', 'firstName lastName profilePicture freelancerProfile');

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Increment view count
    await this.projectModel.findByIdAndUpdate(projectId, {
      $inc: { 'analytics.views': 1 }
    });

    return project;
  }

  async updateProject(projectId: string, clientId: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.clientId.toString() !== clientId) {
      throw new ForbiddenException('Only project owner can update the project');
    }

    if (project.status !== 'open') {
      throw new BadRequestException('Cannot update project that is not open');
    }

    const updatedProject = await this.projectModel.findByIdAndUpdate(
      projectId,
      { $set: updateProjectDto },
      { new: true }
    );

    if (!updatedProject) {
      throw new NotFoundException('Project not found');
    }

    return updatedProject;
  }

  async deleteProject(projectId: string, clientId: string): Promise<void> {
    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.clientId.toString() !== clientId) {
      throw new ForbiddenException('Only project owner can delete the project');
    }

    if (project.status !== 'open') {
      throw new BadRequestException('Cannot delete project that is not open');
    }

    await this.projectModel.findByIdAndDelete(projectId);
  }

  async submitProposal(projectId: string, freelancerId: string, submitProposalDto: SubmitProposalDto): Promise<void> {
    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.status !== 'open') {
      throw new BadRequestException('Project is not accepting proposals');
    }

    // Check if freelancer already submitted a proposal
    const existingProposal = project.proposals.find(
      p => p.freelancerId.toString() === freelancerId
    );

    if (existingProposal) {
      throw new BadRequestException('You have already submitted a proposal for this project');
    }

    const proposal = {
      freelancerId,
      ...submitProposalDto,
      status: 'pending',
      submittedAt: new Date(),
    };

    await this.projectModel.findByIdAndUpdate(projectId, {
      $push: { proposals: proposal },
      $inc: { 'analytics.applications': 1 }
    });

    // Send email notification to client
    const client = await this.usersService.getUserById(project.clientId.toString());
    await this.emailService.sendProjectInvitation(client.email, project.title, `${client.firstName} ${client.lastName}`);
  }

  async getProposals(projectId: string, userId: string): Promise<any[]> {
    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Only client or freelancers who submitted proposals can view proposals
    if (project.clientId.toString() !== userId) {
      const userProposal = project.proposals.find(p => p.freelancerId.toString() === userId);
      if (!userProposal) {
        throw new ForbiddenException('Access denied');
      }
    }

    return project.proposals;
  }

  async acceptProposal(projectId: string, proposalId: string, clientId: string): Promise<void> {
    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.clientId.toString() !== clientId) {
      throw new ForbiddenException('Only project owner can accept proposals');
    }

    if (project.status !== 'open') {
      throw new BadRequestException('Project is not accepting proposals');
    }

    const proposal = project.proposals.find(p => p._id.toString() === proposalId);
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Update proposal status
    await this.projectModel.findOneAndUpdate(
      { _id: projectId, 'proposals._id': proposalId },
      {
        $set: {
          'proposals.$.status': 'accepted',
          freelancerId: proposal.freelancerId,
          status: 'in-progress'
        }
      }
    );

    // Send email notification to freelancer
    const freelancer = await this.usersService.getUserById(proposal.freelancerId.toString());
    await this.emailService.sendProposalAccepted(freelancer.email, project.title);
  }

  async getClientProjects(clientId: string, query: any) {
    const { page = 1, limit = 10, status } = query;

    const filter: any = { clientId };

    if (status) {
      filter.status = status;
    }

    const projects = await this.projectModel
      .find(filter)
      .populate('freelancerId', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await this.projectModel.countDocuments(filter);

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getFreelancerProjects(freelancerId: string, query: any) {
    const { page = 1, limit = 10, status } = query;

    const filter: any = { freelancerId };

    if (status) {
      filter.status = status;
    }

    const projects = await this.projectModel
      .find(filter)
      .populate('clientId', 'firstName lastName profilePicture clientProfile')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await this.projectModel.countDocuments(filter);

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getFreelancerProposals(freelancerId: string, query: any) {
    const { page = 1, limit = 10, status = 'pending' } = query;

    const projects = await this.projectModel
      .find({
        'proposals.freelancerId': freelancerId,
        'proposals.status': status
      })
      .populate('clientId', 'firstName lastName profilePicture clientProfile')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await this.projectModel.countDocuments({
      'proposals.freelancerId': freelancerId,
      'proposals.status': status
    });

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}
