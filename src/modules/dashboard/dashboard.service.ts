import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

// Schemas
import { Job } from '../../database/schemas/job.schema';
import { Proposal } from '../../database/schemas/proposal.schema';
import { Contract } from '../../database/schemas/contract.schema';
import { Payment } from '../../database/schemas/payment.schema';
import { User } from '../../database/schemas/user.schema';
import { Review } from '../../database/schemas/review.schema';

// DTOs
import {
  ClientDashboardResponseDto,
  ClientDashboardStatsDto,
  RecentJobDto,
  RecentContractDto,
  FreelancerDashboardResponseDto,
  FreelancerDashboardStatsDto,
  RecentProposalDto,
  ActiveContractDto,
} from './dto';

// Enums
import { JobStatus } from '../../common/enums/job-status.enum';
import { ProposalStatus } from '../../common/enums/proposal-status.enum';
import { ContractStatus } from '../../common/enums/contract-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Job.name) private jobModel: Model<Job>,
    @InjectModel(Proposal.name) private proposalModel: Model<Proposal>,
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Review.name) private reviewModel: Model<Review>,
  ) {}

  async getClientDashboard(clientId: string): Promise<ClientDashboardResponseDto> {
    try {
      // Get client statistics
      const stats = await this.getClientStats(clientId);
      
      // Get recent jobs
      const recentJobs = await this.getRecentJobs(clientId);
      
      // Get recent contracts
      const recentContracts = await this.getRecentContracts(clientId);

      return {
        stats,
        recentJobs,
        recentContracts,
        message: 'Client dashboard data retrieved successfully',
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  async getFreelancerDashboard(freelancerId: string): Promise<FreelancerDashboardResponseDto> {
    try {
      // Get freelancer statistics
      const stats = await this.getFreelancerStats(freelancerId);
      
      // Get recent proposals
      const recentProposals = await this.getRecentProposals(freelancerId);
      
      // Get active contracts
      const activeContracts = await this.getActiveContracts(freelancerId);

      return {
        stats,
        recentProposals,
        activeContracts,
        message: 'Freelancer dashboard data retrieved successfully',
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  private async getClientStats(clientId: string): Promise<ClientDashboardStatsDto> {
    const [
      totalJobs,
      activeJobs,
      completedJobs,
      activeContracts,
      pendingProposals,
      totalSpentResult,
    ] = await Promise.all([
      this.jobModel.countDocuments({ clientId: clientId }),
      this.jobModel.countDocuments({ clientId: clientId, status: JobStatus.OPEN }),
      this.jobModel.countDocuments({ clientId: clientId, status: JobStatus.COMPLETED }),
      this.contractModel.countDocuments({ clientId: clientId, status: ContractStatus.ACTIVE }),
      this.proposalModel.countDocuments({ 
        jobId: { $in: await this.jobModel.find({ clientId: clientId }).distinct('_id') },
        status: ProposalStatus.PENDING 
      }),
      this.paymentModel.aggregate([
        { 
          $match: { 
            payerId: clientId, 
            status: PaymentStatus.COMPLETED 
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$amount' } 
          } 
        }
      ]),
    ]);

    const totalSpent = totalSpentResult.length > 0 ? totalSpentResult[0].total : 0;

    return {
      totalJobs,
      activeJobs,
      completedJobs,
      activeContracts,
      totalSpent,
      pendingProposals,
      ongoingProjects: activeContracts, // Same as active contracts for now
    };
  }

  private async getFreelancerStats(freelancerId: string): Promise<FreelancerDashboardStatsDto> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalProposals,
      activeProposals,
      activeContracts,
      completedProjects,
      totalEarningsResult,
      monthlyEarningsResult,
      reviewsResult,
    ] = await Promise.all([
      this.proposalModel.countDocuments({ freelancerId: freelancerId }),
      this.proposalModel.countDocuments({ 
        freelancerId: freelancerId, 
        status: ProposalStatus.PENDING 
      }),
      this.contractModel.countDocuments({ 
        freelancerId: freelancerId, 
        status: ContractStatus.ACTIVE 
      }),
      this.contractModel.countDocuments({ 
        freelancerId: freelancerId, 
        status: ContractStatus.COMPLETED 
      }),
      this.paymentModel.aggregate([
        { 
          $match: { 
            payeeId: freelancerId, 
            status: PaymentStatus.COMPLETED 
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$amount' } 
          } 
        }
      ]),
      this.paymentModel.aggregate([
        { 
          $match: { 
            payeeId: freelancerId, 
            status: PaymentStatus.COMPLETED,
            createdAt: { $gte: startOfMonth }
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$amount' } 
          } 
        }
      ]),
      this.reviewModel.aggregate([
        { 
          $match: { 
            revieweeId: freelancerId 
          } 
        },
        { 
          $group: { 
            _id: null, 
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 }
          } 
        }
      ]),
    ]);

    const totalEarnings = totalEarningsResult.length > 0 ? totalEarningsResult[0].total : 0;
    const monthlyEarnings = monthlyEarningsResult.length > 0 ? monthlyEarningsResult[0].total : 0;
    const averageRating = reviewsResult.length > 0 ? reviewsResult[0].averageRating : 0;
    const totalReviews = reviewsResult.length > 0 ? reviewsResult[0].totalReviews : 0;

    return {
      totalProposals,
      activeProposals,
      activeContracts,
      completedProjects,
      totalEarnings,
      monthlyEarnings,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      totalReviews,
    };
  }

  private async getRecentJobs(clientId: string): Promise<RecentJobDto[]> {
    const jobs = await this.jobModel
      .find({ clientId: clientId })
      .populate('clientId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const jobsWithProposals = await Promise.all(
      jobs.map(async (job: any) => {
        const proposalsCount = await this.proposalModel.countDocuments({ jobId: job._id });
        return {
          id: job._id.toString(),
          title: job.title,
          status: job.status,
          proposalsCount,
          createdAt: job.createdAt,
          budget: job.budget.min, // Use the minimum budget amount
        };
      })
    );

    return jobsWithProposals;
  }

  private async getRecentContracts(clientId: string): Promise<RecentContractDto[]> {
    const contracts = await this.contractModel
      .find({ clientId: clientId })
      .populate('freelancerId', 'firstName lastName')
      .populate('jobId', 'title')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return contracts.map((contract: any) => ({
      id: contract._id.toString(),
      jobTitle: contract.jobId.title,
      freelancerName: `${contract.freelancerId.firstName} ${contract.freelancerId.lastName}`,
      status: contract.status,
      contractValue: contract.totalAmount,
      startDate: contract.startDate,
    }));
  }

  private async getRecentProposals(freelancerId: string): Promise<RecentProposalDto[]> {
    const proposals = await this.proposalModel
      .find({ freelancerId: freelancerId })
      .populate('jobId', 'title clientId')
      .populate({
        path: 'jobId',
        populate: {
          path: 'clientId',
          select: 'firstName lastName'
        }
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return proposals.map((proposal: any) => ({
      id: proposal._id.toString(),
      jobTitle: proposal.jobId.title,
      status: proposal.status,
      proposedAmount: proposal.proposedRate.amount,
      submittedAt: proposal.createdAt,
      clientName: `${proposal.jobId.clientId.firstName} ${proposal.jobId.clientId.lastName}`,
    }));
  }

  private async getActiveContracts(freelancerId: string): Promise<ActiveContractDto[]> {
    const contracts = await this.contractModel
      .find({ 
        freelancerId: freelancerId, 
        status: ContractStatus.ACTIVE 
      })
      .populate('clientId', 'firstName lastName')
      .populate('jobId', 'title')
      .sort({ createdAt: -1 })
      .lean();

    return contracts.map((contract: any) => ({
      id: contract._id.toString(),
      jobTitle: contract.jobId.title,
      clientName: `${contract.clientId.firstName} ${contract.clientId.lastName}`,
      status: contract.status,
      contractValue: contract.totalAmount,
      progress: Math.round((contract.completedMilestones || 0) / Math.max(contract.milestoneCount || 1, 1) * 100),
      nextMilestoneDeadline: undefined, // This would need to be calculated from milestones
    }));
  }
}