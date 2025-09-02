import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Project, ProjectDocument } from '../../projects/schemas/project.schema';
import { Contract, ContractDocument } from '../../contracts/schemas/contract.schema';
import { Proposal, ProposalDocument } from '../../proposals/schemas/proposal.schema';
import { EditFreelancerProfileType, FreelancerProfile } from '../types/freelancer-profile.types';

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

  async updateProfile(freelancerId: string, updateData: EditFreelancerProfileType): Promise<FreelancerProfile> {
    // Find the freelancer
    const freelancer = await this.userModel.findById(freelancerId);
    if (!freelancer) {
      throw new NotFoundException('Freelancer not found');
    }

    // Verify user is a freelancer
    if (!freelancer.role.includes('freelancer')) {
      throw new BadRequestException('User is not a freelancer');
    }

    // Prepare update object
    const updateObject: any = {};

    // Handle common profile fields
    if (updateData.firstName !== undefined) updateObject.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) updateObject.lastName = updateData.lastName;
    if (updateData.profilePicture !== undefined) updateObject.profilePicture = updateData.profilePicture;
    if (updateData.phone !== undefined) updateObject.phone = updateData.phone;
    if (updateData.location !== undefined) updateObject.location = updateData.location;
    if (updateData.languages !== undefined) updateObject.languages = updateData.languages;

    // Handle freelancer profile fields
    if (updateData.title !== undefined) updateObject['freelancerProfile.title'] = updateData.title;
    if (updateData.bio !== undefined) updateObject['freelancerProfile.bio'] = updateData.bio;
    if (updateData.skills !== undefined) updateObject['freelancerProfile.skills'] = updateData.skills;
    if (updateData.experience !== undefined) updateObject['freelancerProfile.experience'] = updateData.experience;
    if (updateData.education !== undefined) updateObject['freelancerProfile.education'] = updateData.education;
    if (updateData.certifications !== undefined) updateObject['freelancerProfile.certifications'] = updateData.certifications;
    if (updateData.portfolio !== undefined) updateObject['freelancerProfile.portfolio'] = updateData.portfolio;
    if (updateData.hourlyRate !== undefined) updateObject['freelancerProfile.hourlyRate'] = updateData.hourlyRate;
    if (updateData.availability !== undefined) updateObject['freelancerProfile.availability'] = updateData.availability;
    if (updateData.workingHours !== undefined) updateObject['freelancerProfile.workingHours'] = updateData.workingHours;

    // Update the freelancer profile
    const updatedFreelancer = await this.userModel.findByIdAndUpdate(
      freelancerId,
      updateObject,
      { new: true, runValidators: true }
    ).select('-password -otpCode -otpExpiry'); // Exclude sensitive fields

    if (!updatedFreelancer) {
      throw new NotFoundException('Failed to update freelancer profile');
    }

    // Transform to match our FreelancerProfile type
    const profile: FreelancerProfile = {
      firstName: updatedFreelancer.firstName,
      lastName: updatedFreelancer.lastName,
      profilePicture: updatedFreelancer.profilePicture,
      phone: updatedFreelancer.phone,
      location: updatedFreelancer.location,
      languages: updatedFreelancer.languages as any, // Type assertion for schema compatibility
      title: updatedFreelancer.freelancerProfile?.title,
      bio: updatedFreelancer.freelancerProfile?.bio,
      skills: updatedFreelancer.freelancerProfile?.skills,
      experience: updatedFreelancer.freelancerProfile?.experience as any,
      education: updatedFreelancer.freelancerProfile?.education,
      certifications: updatedFreelancer.freelancerProfile?.certifications as any, // Date to string conversion needed
      portfolio: updatedFreelancer.freelancerProfile?.portfolio,
      hourlyRate: updatedFreelancer.freelancerProfile?.hourlyRate,
      availability: updatedFreelancer.freelancerProfile?.availability as any,
      workingHours: updatedFreelancer.freelancerProfile?.workingHours,
      stats: updatedFreelancer.stats,
      status: updatedFreelancer.status as any,
      lastLogin: updatedFreelancer.lastLogin,
      followers: updatedFreelancer.followers,
      following: updatedFreelancer.following,
    };

    return profile;
  }
}
