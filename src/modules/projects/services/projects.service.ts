import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from '../../../schemas/project.schema';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { SubmitProposalDto } from '../../proposals/dto/submit-proposal.dto';
import { UsersService } from '../../users/services/users.service';
import { EmailService } from '../../../common/services/email.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '../../../common/exceptions';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private usersService: UsersService,
    private emailService: EmailService,
  ) {}

  async createProject(
    clientId: string,
    createProjectDto: CreateProjectDto,
  ): Promise<Project> {
    const user = await this.usersService.getUserById(clientId);
    if (!user.role.includes('client')) {
      throw new ForbiddenException('Only clients can create projects');
    }

    // Map duration number to string
    let duration: string;
    if (createProjectDto.timeline.duration <= 30) {
      duration = 'short-term';
    } else if (createProjectDto.timeline.duration <= 180) {
      duration = 'long-term';
    } else {
      duration = 'ongoing';
    }

    // Map experience level
    let experienceLevel: string;
    switch (createProjectDto.requirements.experienceLevel) {
      case 'beginner':
        experienceLevel = 'basic';
        break;
      case 'intermediate':
        experienceLevel = 'standard';
        break;
      case 'expert':
        experienceLevel = 'premium';
        break;
      default:
        experienceLevel = 'standard';
    }

    const project = new this.projectModel({
      title: createProjectDto.title,
      description: createProjectDto.description,
      category: createProjectDto.category,
      subcategory: createProjectDto.subcategory,
      clientId,
      requiredSkills: createProjectDto.requiredSkills.map((skill) => ({
        skill,
        level: 'intermediate',
      })),
      budgetType: createProjectDto.type,
      budget: createProjectDto.budget.amount,
      currency: createProjectDto.budget.currency,
      duration,
      deadline: createProjectDto.timeline.deadline || undefined,
      workType: ['remote'],
      experienceLevel,
      tags: createProjectDto.tags,
      visibility: createProjectDto.visibility,
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
      sortOrder = 'desc',
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
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getProjectById(projectId: string): Promise<Project> {
    const project = await this.projectModel
      .findById(projectId)
      .populate('clientId', 'firstName lastName profilePicture clientProfile')
      .populate(
        'freelancerId',
        'firstName lastName profilePicture freelancerProfile',
      );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Increment view count
    await this.projectModel.findByIdAndUpdate(projectId, {
      $inc: { 'analytics.views': 1 },
    });

    return project;
  }

  async updateProject(
    projectId: string,
    clientId: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
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
      { new: true },
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
        pages: Math.ceil(total / limit),
      },
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
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getClientProjectById(
    clientId: string,
    projectId: string,
  ): Promise<Project> {
    // Validate if projectId is a valid ObjectId
    if (!this.isValidObjectId(projectId)) {
      throw new BadRequestException('Invalid project ID format');
    }

    const project = await this.projectModel
      .findOne({ _id: projectId, clientId })
      .populate('clientId', 'firstName lastName profilePicture clientProfile')
      .populate(
        'freelancerId',
        'firstName lastName profilePicture freelancerProfile',
      );

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    // Increment view count
    await this.projectModel.findByIdAndUpdate(projectId, {
      $inc: { 'analytics.views': 1 },
    });

    return project;
  }

  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }
}
