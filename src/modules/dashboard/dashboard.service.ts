import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

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
  ChartDataDto,
  ChartDataResponseDto,
  ChartDataPointDto,
  ActivityFeedResponseDto,
  ActivityItemDto,
  QuickStatsResponseDto,
  QuickStatsDto,
  DeadlinesResponseDto,
  DeadlineItemDto,
} from './dto';

// Enums
import { JobStatus } from '../../common/enums/job-status.enum';
import { ProposalStatus } from '../../common/enums/proposal-status.enum';
import { ContractStatus } from '../../common/enums/contract-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';

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

  // ===================== NEW ANALYTICS METHODS =====================

  async getChartData(userId: string, dto: ChartDataDto): Promise<ChartDataResponseDto> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { type, period = 'monthly', startDate, endDate } = dto;
    const start = startDate ? new Date(startDate) : this.getDefaultStartDate(period);
    const end = endDate ? new Date(endDate) : new Date();

    let data: ChartDataPointDto[] = [];
    let total = 0;

    // Build query based on chart type and user role
    if (type === 'revenue' && user.role === UserRole.CLIENT) {
      // Client spending on contracts
      const payments = await this.paymentModel.aggregate([
        {
          $match: {
            clientId: new Types.ObjectId(userId),
            status: 'succeeded',
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: this.getGroupByExpression(period),
            value: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      data = payments.map(p => ({
        label: this.formatLabel(p._id, period),
        value: p.value,
        metadata: { count: 1 }
      }));
      total = payments.reduce((sum, p) => sum + p.value, 0);

    } else if (type === 'earnings' && user.role === UserRole.FREELANCER) {
      // Freelancer earnings from contracts
      const payments = await this.paymentModel.aggregate([
        {
          $match: {
            freelancerId: new Types.ObjectId(userId),
            status: 'succeeded',
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: this.getGroupByExpression(period),
            value: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      data = payments.map(p => ({
        label: this.formatLabel(p._id, period),
        value: p.value,
        metadata: { count: 1 }
      }));
      total = payments.reduce((sum, p) => sum + p.value, 0);

    } else if (type === 'jobs') {
      if (user.role === UserRole.CLIENT) {
        // Jobs posted by client
        const jobs = await this.jobModel.aggregate([
          {
            $match: {
              clientId: new Types.ObjectId(userId),
              createdAt: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: this.getGroupByExpression(period),
              value: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]);

        data = jobs.map(j => ({
          label: this.formatLabel(j._id, period),
          value: j.value,
          metadata: {}
        }));
        total = jobs.reduce((sum, j) => sum + j.value, 0);
      } else {
        // Jobs applied to by freelancer
        const proposals = await this.proposalModel.aggregate([
          {
            $match: {
              freelancerId: new Types.ObjectId(userId),
              createdAt: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: this.getGroupByExpression(period),
              value: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]);

        data = proposals.map(p => ({
          label: this.formatLabel(p._id, period),
          value: p.value,
          metadata: {}
        }));
        total = proposals.reduce((sum, p) => sum + p.value, 0);
      }

    } else if (type === 'contracts') {
      // Contracts for both roles
      const matchCondition = user.role === UserRole.CLIENT 
        ? { clientId: new Types.ObjectId(userId) }
        : { freelancerId: new Types.ObjectId(userId) };

      const contracts = await this.contractModel.aggregate([
        {
          $match: {
            ...matchCondition,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: this.getGroupByExpression(period),
            value: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      data = contracts.map(c => ({
        label: this.formatLabel(c._id, period),
        value: c.value,
        metadata: {}
      }));
      total = contracts.reduce((sum, c) => sum + c.value, 0);
    }

    return {
      success: true,
      message: 'Chart data retrieved successfully',
      data: {
        title: this.getChartTitle(type || 'contracts', user.role),
        type: type || 'contracts',
        data,
        total,
        period,
        startDate: start,
        endDate: end
      }
    };
  }

  async getRecentActivity(userId: string, page: number = 1, limit: number = 20): Promise<ActivityFeedResponseDto> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const skip = (page - 1) * limit;
    const activities: ActivityItemDto[] = [];

    // Fetch different activity types based on user role
    const matchCondition = user.role === UserRole.CLIENT 
      ? { clientId: new Types.ObjectId(userId) }
      : { freelancerId: new Types.ObjectId(userId) };

    // Jobs (for clients)
    if (user.role === UserRole.CLIENT) {
      const jobs = await this.jobModel
        .find({ clientId: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      jobs.forEach((job: any) => {
        activities.push({
          type: 'job_created',
          title: 'Job Posted',
          description: `You posted a new job: ${job.title}`,
          entityId: job._id.toString(),
          entityType: 'job',
          timestamp: job.createdAt,
          icon: 'briefcase'
        });
      });
    }

    // Proposals
    const proposals = await this.proposalModel
      .find(user.role === UserRole.CLIENT 
        ? { jobId: { $in: await this.jobModel.find({ clientId: userId }).distinct('_id') } }
        : { freelancerId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('jobId', 'title')
      .lean();

    proposals.forEach((proposal: any) => {
      activities.push({
        type: 'proposal_submitted',
        title: user.role === UserRole.CLIENT ? 'Proposal Received' : 'Proposal Submitted',
        description: user.role === UserRole.CLIENT 
          ? `New proposal received for ${proposal.jobId?.title}`
          : `You submitted a proposal for ${proposal.jobId?.title}`,
        entityId: proposal._id.toString(),
        entityType: 'proposal',
        timestamp: proposal.createdAt,
        icon: 'file-text'
      });
    });

    // Contracts
    const contracts = await this.contractModel
      .find(matchCondition)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('jobId', 'title')
      .lean();

    contracts.forEach((contract: any) => {
      activities.push({
        type: 'contract_signed',
        title: 'Contract Signed',
        description: `Contract signed for ${contract.jobId?.title}`,
        entityId: contract._id.toString(),
        entityType: 'contract',
        timestamp: contract.createdAt,
        icon: 'file-signature'
      });
    });

    // Payments
    const payments = await this.paymentModel
      .find(user.role === UserRole.CLIENT 
        ? { clientId: userId, status: 'succeeded' }
        : { freelancerId: userId, status: 'succeeded' })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    payments.forEach((payment: any) => {
      activities.push({
        type: 'payment_received',
        title: user.role === UserRole.CLIENT ? 'Payment Made' : 'Payment Received',
        description: `${user.role === UserRole.CLIENT ? 'Paid' : 'Received'} $${payment.amount.toFixed(2)}`,
        entityId: payment._id.toString(),
        entityType: 'payment',
        timestamp: payment.createdAt,
        icon: 'dollar-sign'
      });
    });

    // Reviews
    const reviews = await this.reviewModel
      .find(user.role === UserRole.CLIENT 
        ? { clientId: userId }
        : { freelancerId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    reviews.forEach((review: any) => {
      activities.push({
        type: 'review_received',
        title: 'Review Received',
        description: `You received a ${review.rating}-star review`,
        entityId: review._id.toString(),
        entityType: 'review',
        timestamp: review.createdAt,
        icon: 'star'
      });
    });

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Paginate
    const paginatedActivities = activities.slice(skip, skip + limit);
    const total = activities.length;

    return {
      success: true,
      message: 'Activity feed retrieved successfully',
      data: {
        activities: paginatedActivities,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      }
    };
  }

  async getQuickStats(userId: string): Promise<QuickStatsResponseDto> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

    const stats: QuickStatsDto[] = [];

    if (user.role === UserRole.CLIENT) {
      // Active jobs
      const activeJobs = await this.jobModel.countDocuments({ 
        clientId: userId, 
        status: { $in: ['open', 'in_progress'] }
      });
      const lastMonthActiveJobs = await this.jobModel.countDocuments({ 
        clientId: userId, 
        status: { $in: ['open', 'in_progress'] },
        createdAt: { $lte: lastMonth }
      });
      const change = lastMonthActiveJobs > 0 
        ? ((activeJobs - lastMonthActiveJobs) / lastMonthActiveJobs * 100)
        : 0;

      stats.push({
        label: 'Active Jobs',
        value: activeJobs.toString(),
        change: parseFloat(change.toFixed(1)),
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
        icon: 'briefcase'
      });

      // Total spent
      const totalSpent = await this.paymentModel.aggregate([
        { $match: { clientId: new Types.ObjectId(userId), status: 'succeeded' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const lastMonthSpent = await this.paymentModel.aggregate([
        { 
          $match: { 
            clientId: new Types.ObjectId(userId), 
            status: 'succeeded',
            createdAt: { $gte: lastMonth, $lte: now }
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const twoMonthsAgoSpent = await this.paymentModel.aggregate([
        { 
          $match: { 
            clientId: new Types.ObjectId(userId), 
            status: 'succeeded',
            createdAt: { $gte: twoMonthsAgo, $lte: lastMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const currentSpent = lastMonthSpent[0]?.total || 0;
      const previousSpent = twoMonthsAgoSpent[0]?.total || 0;
      const spentChange = previousSpent > 0 
        ? ((currentSpent - previousSpent) / previousSpent * 100)
        : 0;

      stats.push({
        label: 'Total Spent',
        value: `$${(totalSpent[0]?.total || 0).toFixed(2)}`,
        change: parseFloat(spentChange.toFixed(1)),
        trend: spentChange > 0 ? 'up' : spentChange < 0 ? 'down' : 'neutral',
        icon: 'dollar-sign'
      });

      // Active contracts
      const activeContracts = await this.contractModel.countDocuments({ 
        clientId: userId, 
        status: ContractStatus.ACTIVE 
      });

      stats.push({
        label: 'Active Contracts',
        value: activeContracts.toString(),
        change: 0,
        trend: 'neutral',
        icon: 'file-text'
      });

      // Pending proposals
      const pendingProposals = await this.proposalModel.countDocuments({
        jobId: { $in: await this.jobModel.find({ clientId: userId }).distinct('_id') },
        status: 'pending'
      });

      stats.push({
        label: 'Pending Proposals',
        value: pendingProposals.toString(),
        change: 0,
        trend: 'neutral',
        icon: 'clock'
      });

    } else if (user.role === UserRole.FREELANCER) {
      // Active contracts
      const activeContracts = await this.contractModel.countDocuments({ 
        freelancerId: userId, 
        status: ContractStatus.ACTIVE 
      });

      stats.push({
        label: 'Active Contracts',
        value: activeContracts.toString(),
        change: 0,
        trend: 'neutral',
        icon: 'file-text'
      });

      // Total earnings
      const totalEarnings = await this.paymentModel.aggregate([
        { $match: { freelancerId: new Types.ObjectId(userId), status: 'succeeded' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const lastMonthEarnings = await this.paymentModel.aggregate([
        { 
          $match: { 
            freelancerId: new Types.ObjectId(userId), 
            status: 'succeeded',
            createdAt: { $gte: lastMonth, $lte: now }
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const twoMonthsAgoEarnings = await this.paymentModel.aggregate([
        { 
          $match: { 
            freelancerId: new Types.ObjectId(userId), 
            status: 'succeeded',
            createdAt: { $gte: twoMonthsAgo, $lte: lastMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const currentEarnings = lastMonthEarnings[0]?.total || 0;
      const previousEarnings = twoMonthsAgoEarnings[0]?.total || 0;
      const earningsChange = previousEarnings > 0 
        ? ((currentEarnings - previousEarnings) / previousEarnings * 100)
        : 0;

      stats.push({
        label: 'Total Earnings',
        value: `$${(totalEarnings[0]?.total || 0).toFixed(2)}`,
        change: parseFloat(earningsChange.toFixed(1)),
        trend: earningsChange > 0 ? 'up' : earningsChange < 0 ? 'down' : 'neutral',
        icon: 'dollar-sign'
      });

      // Pending proposals
      const pendingProposals = await this.proposalModel.countDocuments({ 
        freelancerId: userId, 
        status: 'pending' 
      });

      stats.push({
        label: 'Pending Proposals',
        value: pendingProposals.toString(),
        change: 0,
        trend: 'neutral',
        icon: 'clock'
      });

      // Available balance
      const balance = (user as any).availableBalance || 0;
      stats.push({
        label: 'Available Balance',
        value: `$${balance.toFixed(2)}`,
        change: 0,
        trend: 'neutral',
        icon: 'wallet'
      });
    }

    return {
      success: true,
      message: 'Quick stats retrieved successfully',
      data: {
        stats,
        lastUpdated: new Date()
      }
    };
  }

  async getUpcomingDeadlines(userId: string): Promise<DeadlinesResponseDto> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const deadlines: DeadlineItemDto[] = [];

    // Get contracts with deadlines
    const matchCondition = user.role === UserRole.CLIENT 
      ? { clientId: new Types.ObjectId(userId) }
      : { freelancerId: new Types.ObjectId(userId) };

    const contracts = await this.contractModel
      .find({
        ...matchCondition,
        status: { $in: [ContractStatus.ACTIVE, ContractStatus.PENDING] },
        endDate: { $exists: true, $ne: null }
      })
      .populate('jobId', 'title')
      .sort({ endDate: 1 })
      .lean();

    contracts.forEach((contract: any) => {
      if (contract.endDate) {
        const daysRemaining = Math.ceil((new Date(contract.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const priority = daysRemaining < 0 ? 'high' : daysRemaining <= 3 ? 'high' : daysRemaining <= 7 ? 'medium' : 'low';

        deadlines.push({
          id: contract._id.toString(),
          title: contract.jobId?.title || 'Contract',
          type: 'contract',
          dueDate: contract.endDate,
          daysRemaining,
          priority,
          entityId: contract._id.toString(),
          status: contract.status
        });
      }
    });

    // Get milestones (only for freelancers)
    if (user.role === UserRole.FREELANCER) {
      // Need to import Milestone model - assuming it exists
      // This is a placeholder - adjust based on actual milestone schema
      const Milestone = this.contractModel.db.model('Milestone');
      const milestones = await Milestone
        .find({
          contractId: { $in: await this.contractModel.find({ freelancerId: userId }).distinct('_id') },
          status: { $in: ['pending', 'in_progress'] },
          dueDate: { $exists: true, $ne: null }
        })
        .populate('contractId')
        .sort({ dueDate: 1 })
        .lean();

      milestones.forEach((milestone: any) => {
        const daysRemaining = Math.ceil((new Date(milestone.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const priority = daysRemaining < 0 ? 'high' : daysRemaining <= 3 ? 'high' : daysRemaining <= 7 ? 'medium' : 'low';

        deadlines.push({
          id: milestone._id.toString(),
          title: milestone.title || `Milestone ${milestone.milestoneNumber}`,
          type: 'milestone',
          dueDate: milestone.dueDate,
          daysRemaining,
          priority,
          entityId: milestone._id.toString(),
          status: milestone.status
        });
      });
    }

    // Get proposals with deadlines (only for freelancers)
    if (user.role === UserRole.FREELANCER) {
      const proposals = await this.proposalModel
        .find({
          freelancerId: userId,
          status: 'pending'
        })
        .populate('jobId')
        .sort({ createdAt: 1 })
        .lean();

      proposals.forEach((proposal: any) => {
        if (proposal.jobId?.applicationDeadline) {
          const daysRemaining = Math.ceil((new Date(proposal.jobId.applicationDeadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const priority = daysRemaining < 0 ? 'high' : daysRemaining <= 3 ? 'high' : daysRemaining <= 7 ? 'medium' : 'low';

          deadlines.push({
            id: proposal._id.toString(),
            title: `Proposal: ${proposal.jobId?.title}`,
            type: 'proposal',
            dueDate: proposal.jobId.applicationDeadline,
            daysRemaining,
            priority,
            entityId: proposal._id.toString(),
            status: proposal.status
          });
        }
      });
    }

    // Sort by due date
    deadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Calculate counts
    const overdue = deadlines.filter(d => d.daysRemaining < 0).length;
    const dueToday = deadlines.filter(d => d.daysRemaining === 0).length;
    const dueThisWeek = deadlines.filter(d => d.daysRemaining > 0 && d.daysRemaining <= 7).length;

    return {
      success: true,
      message: 'Upcoming deadlines retrieved successfully',
      data: {
        deadlines,
        total: deadlines.length,
        overdue,
        dueToday,
        dueThisWeek
      }
    };
  }

  // ===================== HELPER METHODS =====================

  private getDefaultStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      case 'weekly':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
      case 'monthly':
        return new Date(now.getFullYear() - 1, now.getMonth(), 1);
      case 'yearly':
        return new Date(now.getFullYear() - 5, 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    }
  }

  private getGroupByExpression(period: string): any {
    switch (period) {
      case 'daily':
        return {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
      case 'weekly':
        return {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
      case 'monthly':
        return {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
      case 'yearly':
        return { year: { $year: '$createdAt' } };
      default:
        return {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
    }
  }

  private formatLabel(dateGroup: any, period: string): string {
    switch (period) {
      case 'daily':
        return `${dateGroup.year}-${String(dateGroup.month).padStart(2, '0')}-${String(dateGroup.day).padStart(2, '0')}`;
      case 'weekly':
        return `${dateGroup.year} W${dateGroup.week}`;
      case 'monthly':
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[dateGroup.month - 1]} ${dateGroup.year}`;
      case 'yearly':
        return `${dateGroup.year}`;
      default:
        return JSON.stringify(dateGroup);
    }
  }

  private getChartTitle(type: string, role: string): string {
    if (type === 'revenue' && role === UserRole.CLIENT) return 'Total Spending';
    if (type === 'earnings' && role === UserRole.FREELANCER) return 'Total Earnings';
    if (type === 'jobs' && role === UserRole.CLIENT) return 'Jobs Posted';
    if (type === 'jobs' && role === UserRole.FREELANCER) return 'Jobs Applied';
    if (type === 'contracts') return 'Contracts';
    return 'Chart Data';
  }
}