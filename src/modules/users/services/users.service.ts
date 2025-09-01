import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateFreelancerProfileDto } from '../dto/update-freelancer-profile.dto';
import { UpdateClientProfileDto } from '../dto/update-client-profile.dto';
import { Proposal, ProposalDocument } from '../../proposals/schemas/proposal.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel('Project') private projectModel: Model<any>,
    @InjectModel('Contract') private contractModel: Model<any>,
    @InjectModel(Proposal.name) private proposalModel: Model<ProposalDocument>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-password -otpCode -otpExpiry');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateProfileDto },
      { new: true, runValidators: true }
    ).select('-password -otpCode -otpExpiry');

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateFreelancerProfile(userId: string, updateFreelancerProfileDto: UpdateFreelancerProfileDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.role.includes('freelancer')) {
      throw new BadRequestException('User is not a freelancer');
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { freelancerProfile: updateFreelancerProfileDto } },
      { new: true, runValidators: true }
    ).select('-password -otpCode -otpExpiry');

    return updatedUser;
  }

  async updateClientProfile(userId: string, updateClientProfileDto: UpdateClientProfileDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.role.includes('client')) {
      throw new BadRequestException('User is not a client');
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { clientProfile: updateClientProfileDto } },
      { new: true, runValidators: true }
    ).select('-password -otpCode -otpExpiry');

    return updatedUser;
  }

  async getFreelancers(query: any) {
    const { page = 1, limit = 10, skills, experience, minRate, maxRate, availability } = query;

    const filter: any = {
      role: { $in: ['freelancer'] },
      status: 'active'
    };

    if (skills) {
      filter['freelancerProfile.skills'] = { $in: skills.split(',') };
    }

    if (experience) {
      filter['freelancerProfile.experience'] = experience;
    }

    if (minRate || maxRate) {
      filter['freelancerProfile.hourlyRate'] = {};
      if (minRate) filter['freelancerProfile.hourlyRate'].$gte = Number(minRate);
      if (maxRate) filter['freelancerProfile.hourlyRate'].$lte = Number(maxRate);
    }

    if (availability) {
      filter['freelancerProfile.availability'] = availability;
    }

    const freelancers = await this.userModel
      .find(filter)
      .select('firstName lastName profilePicture freelancerProfile stats')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ 'stats.avgRating': -1, 'stats.projectsCompleted': -1 });

    const total = await this.userModel.countDocuments(filter);

    return {
      freelancers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getClients(query: any) {
    const { page = 1, limit = 10, industry, companySize } = query;

    const filter: any = {
      role: { $in: ['client'] },
      status: 'active'
    };

    if (industry) {
      filter['clientProfile.industry'] = industry;
    }

    if (companySize) {
      filter['clientProfile.companySize'] = companySize;
    }

    const clients = await this.userModel
      .find(filter)
      .select('firstName lastName profilePicture clientProfile stats')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ 'stats.totalSpent': -1 });

    const total = await this.userModel.countDocuments(filter);

    return {
      clients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getUserById(userId: string) {
    const user = await this.userModel.findById(userId).select('-password -otpCode -otpExpiry');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async followUser(followerId: string, userId: string) {
    if (followerId === userId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Add to following list of follower
    await this.userModel.findByIdAndUpdate(followerId, {
      $addToSet: { following: userId }
    });

    // Add to followers list of user
    await this.userModel.findByIdAndUpdate(userId, {
      $addToSet: { followers: followerId }
    });

    return { message: 'Successfully followed user' };
  }

  async unfollowUser(followerId: string, userId: string) {
    // Remove from following list of follower
    await this.userModel.findByIdAndUpdate(followerId, {
      $pull: { following: userId }
    });

    // Remove from followers list of user
    await this.userModel.findByIdAndUpdate(userId, {
      $pull: { followers: followerId }
    });

    return { message: 'Successfully unfollowed user' };
  }

  async getFollowers(userId: string) {
    const user = await this.userModel.findById(userId).populate('followers', 'firstName lastName profilePicture');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.followers;
  }

  async getFollowing(userId: string) {
    const user = await this.userModel.findById(userId).populate('following', 'firstName lastName profilePicture');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.following;
  }

  async getClientDashboard(clientId: string) {
    // Get total projects
    const totalProjects = await this.projectModel.countDocuments({ clientId });

    // Get active projects (open or in-progress)
    const activeProjects = await this.projectModel.countDocuments({
      clientId,
      status: { $in: ['open', 'in-progress'] }
    });

    // Get completed projects
    const completedProjects = await this.projectModel.countDocuments({
      clientId,
      status: 'completed'
    });

    // Get active contracts
    const activeContracts = await this.contractModel.countDocuments({
      clientId,
      status: { $in: ['active', 'in-progress'] }
    });

    // Get recent projects
    const recentProjectsRaw = await this.projectModel
      .find({ clientId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status createdAt budget');

    // Transform recent projects to include budget as object
    const recentProjects = recentProjectsRaw.map(project => ({
      _id: project._id,
      title: project.title,
      status: project.status,
      createdAt: project.createdAt,
      budget: { amount: project.budget }
    }));

    // Calculate total spent (this would need payment data)
    const totalSpent = 0; // Placeholder - would need to aggregate payments

    // Get project IDs for proposals query
    const clientProjects = await this.projectModel.find({ clientId }).select('_id');
    const projectIds = clientProjects.map(project => project._id);

    // Get pending proposals count from separate proposals collection
    const pendingProposalsCount = await this.proposalModel.countDocuments({
      projectId: { $in: projectIds },
      status: 'pending'
    });

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalSpent,
      activeContracts,
      pendingProposals: pendingProposalsCount,
      recentProjects,
    };
  }
}
