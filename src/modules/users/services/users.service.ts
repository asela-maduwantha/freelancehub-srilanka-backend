import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../schemas/user.schema';
import {
  FreelancerProfile,
  FreelancerProfileDocument,
} from '../../../schemas/freelancer-profile.schema';
import {
  ClientProfile,
  ClientProfileDocument,
} from '../../../schemas/client-profile.schema';
import { Project, ProjectDocument } from '../../../schemas/project.schema';
import { Contract, ContractDocument } from '../../../schemas/contract.schema';
import { Proposal, ProposalDocument } from '../../../schemas/proposal.schema';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { PaginatedResponse } from '../../../common/interfaces/pagination.interface';
import {
  NotFoundException,
  BadRequestException,
} from '../../../common/exceptions';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(FreelancerProfile.name)
    private freelancerProfileModel: Model<FreelancerProfileDocument>,
    @InjectModel(ClientProfile.name)
    private clientProfileModel: Model<ClientProfileDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(Proposal.name) private proposalModel: Model<ProposalDocument>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password -otpCode -otpExpiry');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: updateProfileDto },
        { new: true, runValidators: true },
      )
      .select('-password');

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getFreelancerProfile(userId: string) {
    const profile = await this.freelancerProfileModel
      .findOne({ userId })
      .populate('userId', '-password');
    if (!profile) {
      throw new NotFoundException('Freelancer profile not found');
    }
    return profile;
  }

  async updateFreelancerProfile(userId: string, updateData: any) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'freelancer') {
      throw new BadRequestException('User is not a freelancer');
    }

    const profile = await this.freelancerProfileModel.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, runValidators: true, upsert: true },
    );

    return profile;
  }

  async getClientProfile(userId: string) {
    const profile = await this.clientProfileModel
      .findOne({ userId })
      .populate('userId', '-password');
    if (!profile) {
      throw new NotFoundException('Client profile not found');
    }
    return profile;
  }

  async updateClientProfile(userId: string, updateData: any) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'client') {
      throw new BadRequestException('User is not a client');
    }

    const profile = await this.clientProfileModel.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, runValidators: true, upsert: true },
    );

    return profile;
  }

  async createClientProfile(userId: string, createData: any) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'client') {
      throw new BadRequestException('User is not a client');
    }

    // Check if profile already exists
    const existingProfile = await this.clientProfileModel.findOne({ userId });
    if (existingProfile) {
      throw new BadRequestException('Client profile already exists');
    }

    const profile = new this.clientProfileModel({
      ...createData,
      userId,
    });

    return await profile.save();
  }

  async getFreelancers(query: any): Promise<PaginatedResponse<any>> {
    const {
      page = 1,
      limit = 10,
      skills,
      experience,
      minRate,
      maxRate,
      availability,
    } = query;

    const filter: any = {};

    if (skills) {
      filter.skills = { $in: skills.split(',') };
    }

    if (experience) {
      filter.experienceLevel = experience;
    }

    if (minRate || maxRate) {
      filter.hourlyRate = {};
      if (minRate) filter.hourlyRate.$gte = Number(minRate);
      if (maxRate) filter.hourlyRate.$lte = Number(maxRate);
    }

    if (availability) {
      filter['availability.status'] = availability;
    }

  const freelancers = await this.freelancerProfileModel
    .find(filter)
    .populate('userId', '-password')
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ hourlyRate: -1, createdAt: -1 });

  // Filter out inactive users
  const activeFreelancers = freelancers.filter(
    (freelancer) => freelancer.userId && (freelancer.userId as any).isActive !== false,
  );    const total = await this.freelancerProfileModel.countDocuments(filter);

    return {
      data: activeFreelancers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getClients(query: any): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10, industry, companySize } = query;

    const filter: any = {};

    if (industry) {
      filter.industry = industry;
    }

    if (companySize) {
      filter.companySize = companySize;
    }

    const clients = await this.clientProfileModel
      .find(filter)
      .populate('userId', '-password')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Filter out inactive users
    const activeClients = clients.filter(
      (client) => client.userId && (client.userId as any).isActive !== false,
    );

    const total = await this.clientProfileModel.countDocuments(filter);

    return {
      data: activeClients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.userModel.findById(userId).select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getClientDashboard(clientId: string) {
    // Get total projects
    const totalProjects = await this.projectModel.countDocuments({ clientId });

    // Get active projects
    const activeProjects = await this.projectModel.countDocuments({
      clientId,
      status: { $in: ['active'] },
    });

    // Get completed projects
    const completedProjects = await this.projectModel.countDocuments({
      clientId,
      status: 'completed',
    });

    // Get active contracts
    const activeContracts = await this.contractModel.countDocuments({
      clientId,
      status: { $in: ['active'] },
    });

    // Get recent projects
    const recentProjects = await this.projectModel
      .find({ clientId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status createdAt budget');

    // Get project IDs for proposals query
    const clientProjects = await this.projectModel
      .find({ clientId })
      .select('_id');
    const projectIds = clientProjects.map((project) => project._id);

    // Get pending proposals count
    const pendingProposalsCount = await this.proposalModel.countDocuments({
      projectId: { $in: projectIds },
      status: 'submitted',
    });

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      activeContracts,
      pendingProposals: pendingProposalsCount,
      recentProjects,
    };
  }

  async searchUsers(query: string): Promise<any[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchRegex = new RegExp(query.trim(), 'i');

    const users = await this.userModel
      .find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      })
      .select('name email role _id')
      .limit(20)
      .sort({ name: 1 });

    return users.map((user) => ({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
    }));
  }

  async checkUserHasSavedCards(userId: string): Promise<{ hasSavedCards: boolean; cardCount: number }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const savedCards = user.savedPaymentMethods?.filter(method => method.type === 'card') || [];
    const hasSavedCards = savedCards.length > 0;

    return {
      hasSavedCards,
      cardCount: savedCards.length,
    };
  }
}
