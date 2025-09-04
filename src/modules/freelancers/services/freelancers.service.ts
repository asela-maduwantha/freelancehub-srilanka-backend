import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../schemas/user.schema';
import { FreelancerProfile, FreelancerProfileDocument } from '../../../schemas/freelancer-profile.schema';
import { Project, ProjectDocument } from '../../../schemas/project.schema';
import { Contract, ContractDocument } from '../../../schemas/contract.schema';
import { Proposal, ProposalDocument } from '../../../schemas/proposal.schema';
import { CreateFreelancerProfileDto, UpdateFreelancerProfileDto } from '../../../dto/freelancer-profile.dto';
import { FreelancerSearchQuery } from '../types/freelancer-profile.types';

@Injectable()
export class FreelancersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(FreelancerProfile.name) private freelancerProfileModel: Model<FreelancerProfileDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(Proposal.name) private proposalModel: Model<ProposalDocument>,
  ) {}

  async getFreelancerDashboard(freelancerId: string) {
    // Get active proposals
    const activeProposals = await this.proposalModel.countDocuments({
      freelancerId,
      status: 'submitted',
    });

    // Get accepted proposals
    const acceptedProposals = await this.proposalModel.countDocuments({
      freelancerId,
      status: 'accepted',
    });

    // Get active contracts
    const activeContracts = await this.contractModel.countDocuments({
      freelancerId,
      status: 'active',
    });

    // Get completed contracts
    const completedContracts = await this.contractModel.countDocuments({
      freelancerId,
      status: 'completed',
    });

    // Get total earned from completed contracts
    const totalEarnedResult = await this.contractModel.aggregate([
      { $match: { freelancerId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalEarned = totalEarnedResult[0]?.total || 0;

    // Get recent contracts
    const recentContracts = await this.contractModel
      .find({ freelancerId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status createdAt totalAmount')
      .populate('projectId', 'title category');

    return {
      activeProposals,
      acceptedProposals,
      activeContracts,
      completedContracts,
      totalEarned,
      recentContracts,
    };
  }

  async getFreelancerProfile(userId: string) {
    const profile = await this.freelancerProfileModel
      .findOne({ userId })
      .populate('userId', 'name email profilePicture isActive');
    
    if (!profile) {
      throw new NotFoundException('Freelancer profile not found');
    }
    
    return profile;
  }

  async updateProfile(userId: string, updateData: UpdateFreelancerProfileDto) {
    // Verify user exists and is a freelancer
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'freelancer') {
      throw new BadRequestException('User is not a freelancer');
    }

    // Update the freelancer profile
    const profile = await this.freelancerProfileModel.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, runValidators: true, upsert: true }
    ).populate('userId', 'name email profilePicture');

    return profile;
  }

  async getAllFreelancers(query: FreelancerSearchQuery = {}) {
    const { page = 1, limit = 10, skills, experienceLevel, minRate, maxRate, availability } = query;

    const filter: any = {};

    if (skills) {
      filter.skills = { $in: skills.split(',') };
    }

    if (experienceLevel) {
      filter.experienceLevel = experienceLevel;
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
      .populate('userId', 'name email profilePicture isActive')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ hourlyRate: -1, createdAt: -1 });

    // Filter out inactive users
    const activeFreelancers = freelancers.filter(freelancer => 
      freelancer.userId && (freelancer.userId as any).isActive
    );

    const total = await this.freelancerProfileModel.countDocuments(filter);

    return {
      data: activeFreelancers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async createProfile(userId: string, createData: CreateFreelancerProfileDto) {
    // Check if profile already exists
    const existingProfile = await this.freelancerProfileModel.findOne({ userId });
    if (existingProfile) {
      throw new BadRequestException('Freelancer profile already exists');
    }

    // Verify user exists and is a freelancer
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'freelancer') {
      throw new BadRequestException('User is not a freelancer');
    }

    // Create new profile
    const newProfile = new this.freelancerProfileModel({ ...createData, userId });
    return await newProfile.save();
  }
}
