import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Project } from '../../projects/schemas/project.schema';
import { Contract } from '../../contracts/schemas/contract.schema';
import { Proposal } from '../../proposals/schemas/proposal.schema';
import { Payment } from '../../payments/schemas/payment.schema';

export interface UserAnalytics {
  // Basic metrics
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalEarnings: number;
  totalSpent: number;
  avgRating: number;

  // Engagement metrics
  profileViews: number;
  profileCompletion: number;
  responseRate: number;
  responseTime: number;
  completionRate: number;

  // Activity metrics
  proposalsSent: number;
  proposalsAccepted: number;
  contractsSigned: number;
  lastActivity: Date;

  // Performance metrics
  onTimeDelivery: number;
  clientSatisfaction: number;
  repeatClients: number;

  // Financial metrics
  monthlyEarnings: { month: string; amount: number }[];
  paymentHistory: { date: string; amount: number; type: string }[];

  // Trend metrics
  ratingTrend: { date: string; rating: number }[];
  activityTrend: { date: string; count: number }[];
}

export interface FreelancerAnalytics extends UserAnalytics {
  // Freelancer-specific metrics
  skills: string[];
  hourlyRate: number;
  availability: string;
  portfolioViews: number;
  bidSuccessRate: number;
  averageBidAmount: number;
  specializationScore: number;
  clientRetentionRate: number;
}

export interface ClientAnalytics extends UserAnalytics {
  // Client-specific metrics
  projectsPosted: number;
  averageProjectBudget: number;
  freelancerRetentionRate: number;
  projectSuccessRate: number;
  averageTimeToHire: number;
  budgetUtilization: number;
}

@Injectable()
export class UserAnalyticsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel('Project') private projectModel: Model<Project>,
    @InjectModel('Contract') private contractModel: Model<Contract>,
    @InjectModel('Proposal') private proposalModel: Model<Proposal>,
    @InjectModel('Payment') private paymentModel: Model<Payment>,
  ) {}

  async calculateUserAnalytics(userId: string): Promise<UserAnalytics> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isFreelancer = user.role.includes('freelancer');
    const isClient = user.role.includes('client');

    // Basic project metrics
    const totalProjects = await this.getTotalProjects(userId, isFreelancer, isClient);
    const activeProjects = await this.getActiveProjects(userId, isFreelancer, isClient);
    const completedProjects = await this.getCompletedProjects(userId, isFreelancer, isClient);

    // Financial metrics
    const totalEarnings = await this.getTotalEarnings(userId);
    const totalSpent = await this.getTotalSpent(userId);
    const monthlyEarnings = await this.getMonthlyEarnings(userId);

    // Rating and performance metrics
    const avgRating = await this.getAverageRating(userId);
    const completionRate = await this.getCompletionRate(userId, isFreelancer, isClient);
    const responseRate = await this.getResponseRate(userId, isFreelancer, isClient);
    const responseTime = await this.getResponseTime(userId, isFreelancer, isClient);

    // Activity metrics
    const proposalsSent = await this.getProposalsSent(userId);
    const proposalsAccepted = await this.getProposalsAccepted(userId);
    const contractsSigned = await this.getContractsSigned(userId);

    // Engagement metrics
    const profileViews = await this.getProfileViews(userId);
    const profileCompletion = this.calculateProfileCompletion(user);
    const lastActivity = await this.getLastActivity(userId);

    // Performance metrics
    const onTimeDelivery = await this.getOnTimeDeliveryRate(userId);
    const clientSatisfaction = await this.getClientSatisfaction(userId);
    const repeatClients = await this.getRepeatClients(userId);

    // Trend metrics
    const ratingTrend = await this.getRatingTrend(userId);
    const activityTrend = await this.getActivityTrend(userId);
    const paymentHistory = await this.getPaymentHistory(userId);

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalEarnings,
      totalSpent,
      avgRating,
      profileViews,
      profileCompletion,
      responseRate,
      responseTime,
      completionRate,
      proposalsSent,
      proposalsAccepted,
      contractsSigned,
      lastActivity,
      onTimeDelivery,
      clientSatisfaction,
      repeatClients,
      monthlyEarnings,
      paymentHistory,
      ratingTrend,
      activityTrend,
    };
  }

  async calculateFreelancerAnalytics(userId: string): Promise<FreelancerAnalytics> {
    const baseAnalytics = await this.calculateUserAnalytics(userId);
    const user = await this.userModel.findById(userId);

    // Freelancer-specific metrics
    const skills = user?.freelancerProfile?.skills || [];
    const hourlyRate = user?.freelancerProfile?.hourlyRate || 0;
    const availability = user?.freelancerProfile?.availability || 'not-available';
    const portfolioViews = await this.getPortfolioViews(userId);
    const bidSuccessRate = await this.getBidSuccessRate(userId);
    const averageBidAmount = await this.getAverageBidAmount(userId);
    const specializationScore = await this.getSpecializationScore(userId);
    const clientRetentionRate = await this.getClientRetentionRate(userId);

    return {
      ...baseAnalytics,
      skills,
      hourlyRate,
      availability,
      portfolioViews,
      bidSuccessRate,
      averageBidAmount,
      specializationScore,
      clientRetentionRate,
    };
  }

  async calculateClientAnalytics(userId: string): Promise<ClientAnalytics> {
    const baseAnalytics = await this.calculateUserAnalytics(userId);

    // Client-specific metrics
    const projectsPosted = await this.getProjectsPosted(userId);
    const averageProjectBudget = await this.getAverageProjectBudget(userId);
    const freelancerRetentionRate = await this.getFreelancerRetentionRate(userId);
    const projectSuccessRate = await this.getProjectSuccessRate(userId);
    const averageTimeToHire = await this.getAverageTimeToHire(userId);
    const budgetUtilization = await this.getBudgetUtilization(userId);

    return {
      ...baseAnalytics,
      projectsPosted,
      averageProjectBudget,
      freelancerRetentionRate,
      projectSuccessRate,
      averageTimeToHire,
      budgetUtilization,
    };
  }

  // Helper methods for calculations
  private async getTotalProjects(userId: string, isFreelancer: boolean, isClient: boolean): Promise<number> {
    if (isFreelancer) {
      return await this.contractModel.countDocuments({ freelancerId: userId });
    } else if (isClient) {
      return await this.projectModel.countDocuments({ clientId: userId });
    }
    return 0;
  }

  private async getActiveProjects(userId: string, isFreelancer: boolean, isClient: boolean): Promise<number> {
    if (isFreelancer) {
      return await this.contractModel.countDocuments({
        freelancerId: userId,
        status: { $in: ['active', 'in-progress'] }
      });
    } else if (isClient) {
      return await this.projectModel.countDocuments({
        clientId: userId,
        status: { $in: ['open', 'in-progress'] }
      });
    }
    return 0;
  }

  private async getCompletedProjects(userId: string, isFreelancer: boolean, isClient: boolean): Promise<number> {
    if (isFreelancer) {
      return await this.contractModel.countDocuments({
        freelancerId: userId,
        status: 'completed'
      });
    } else if (isClient) {
      return await this.projectModel.countDocuments({
        clientId: userId,
        status: 'completed'
      });
    }
    return 0;
  }

  private async getTotalEarnings(userId: string): Promise<number> {
    const payments = await this.paymentModel.find({ payeeId: userId, status: 'completed' });
    return payments.reduce((total, payment: any) => total + (payment.amount || 0), 0);
  }

  private async getTotalSpent(userId: string): Promise<number> {
    const payments = await this.paymentModel.find({ payerId: userId, status: 'completed' });
    return payments.reduce((total, payment: any) => total + (payment.amount || 0), 0);
  }

  private async getMonthlyEarnings(userId: string): Promise<{ month: string; amount: number }[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const payments = await this.paymentModel.aggregate([
      {
        $match: {
          payeeId: userId,
          status: 'completed',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          amount: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    return payments.map((payment: any) => ({
      month: `${payment._id.year}-${payment._id.month.toString().padStart(2, '0')}`,
      amount: payment.amount
    }));
  }

  private async getAverageRating(userId: string): Promise<number> {
    // This would need a reviews collection - placeholder for now
    return 4.5; // Placeholder
  }

  private async getCompletionRate(userId: string, isFreelancer: boolean, isClient: boolean): Promise<number> {
    const totalProjects = await this.getTotalProjects(userId, isFreelancer, isClient);
    const completedProjects = await this.getCompletedProjects(userId, isFreelancer, isClient);

    return totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;
  }

  private async getResponseRate(userId: string, isFreelancer: boolean, isClient: boolean): Promise<number> {
    if (isFreelancer) {
      const totalProposals = await this.proposalModel.countDocuments({ freelancerId: userId });
      const respondedProposals = await this.proposalModel.countDocuments({
        freelancerId: userId,
        status: { $ne: 'pending' }
      });
      return totalProposals > 0 ? (respondedProposals / totalProposals) * 100 : 0;
    }
    return 100; // Clients don't have response rate in the same way
  }

  private async getResponseTime(userId: string, isFreelancer: boolean, isClient: boolean): Promise<number> {
    // Calculate average response time in hours
    if (isFreelancer) {
      const proposals = await this.proposalModel.find({
        freelancerId: userId,
        status: { $ne: 'pending' }
      }).select('createdAt updatedAt');

      if (proposals.length === 0) return 0;

      const totalResponseTime = proposals.reduce((total, proposal: any) => {
        if (proposal.updatedAt && proposal.createdAt) {
          const responseTime = proposal.updatedAt.getTime() - proposal.createdAt.getTime();
          return total + (responseTime / (1000 * 60 * 60)); // Convert to hours
        }
        return total;
      }, 0);

      return totalResponseTime / proposals.length;
    }
    return 0;
  }

  private async getProposalsSent(userId: string): Promise<number> {
    return await this.proposalModel.countDocuments({ freelancerId: userId });
  }

  private async getProposalsAccepted(userId: string): Promise<number> {
    return await this.proposalModel.countDocuments({
      freelancerId: userId,
      status: 'accepted'
    });
  }

  private async getContractsSigned(userId: string): Promise<number> {
    return await this.contractModel.countDocuments({
      $or: [{ freelancerId: userId }, { clientId: userId }]
    });
  }

  private async getProfileViews(userId: string): Promise<number> {
    // This would need a profile views tracking system - placeholder
    return Math.floor(Math.random() * 1000) + 100; // Placeholder
  }

  private calculateProfileCompletion(user: any): number {
    let completedFields = 0;
    let totalFields = 0;

    // Common fields
    const commonFields = ['firstName', 'lastName', 'profilePicture', 'phone', 'location'];
    totalFields += commonFields.length;
    commonFields.forEach(field => {
      if (user[field]) completedFields++;
    });

    // Role-specific fields
    if (user.role.includes('freelancer')) {
      const freelancerFields = ['title', 'bio', 'skills', 'hourlyRate', 'availability'];
      totalFields += freelancerFields.length;
      freelancerFields.forEach(field => {
        if (user.freelancerProfile?.[field]) completedFields++;
      });
    }

    if (user.role.includes('client')) {
      const clientFields = ['companyName', 'industry', 'description'];
      totalFields += clientFields.length;
      clientFields.forEach(field => {
        if (user.clientProfile?.[field]) completedFields++;
      });
    }

    return totalFields > 0 ? (completedFields / totalFields) * 100 : 0;
  }

  private async getLastActivity(userId: string): Promise<Date> {
    // Get the most recent activity from various collections
    const activities = await Promise.all([
      this.proposalModel.findOne({ freelancerId: userId }).sort({ updatedAt: -1 }).select('updatedAt'),
      this.projectModel.findOne({ clientId: userId }).sort({ updatedAt: -1 }).select('updatedAt'),
      this.contractModel.findOne({
        $or: [{ freelancerId: userId }, { clientId: userId }]
      }).sort({ updatedAt: -1 }).select('updatedAt')
    ]);

    const validActivities = activities.filter((activity: any) => activity?.updatedAt);
    if (validActivities.length === 0) {
      return new Date(); // Return current date if no activity
    }

    const firstActivity = validActivities[0] as any;
    return validActivities.reduce((latest: Date, activity: any) =>
      activity.updatedAt > latest ? activity.updatedAt : latest,
      firstActivity.updatedAt
    );
  }

  private async getOnTimeDeliveryRate(userId: string): Promise<number> {
    // This would need contract completion dates vs due dates - placeholder
    return 85; // Placeholder
  }

  private async getClientSatisfaction(userId: string): Promise<number> {
    // This would need review/rating system - placeholder
    return 4.2; // Placeholder
  }

  private async getRepeatClients(userId: string): Promise<number> {
    // Count unique clients who have worked with this freelancer multiple times
    const contracts = await this.contractModel.find({
      freelancerId: userId,
      status: 'completed'
    }).select('clientId');

    const clientCounts: { [key: string]: number } = {};
    contracts.forEach((contract: any) => {
      const clientId = contract.clientId?.toString() || contract.client?.toString();
      if (clientId) {
        clientCounts[clientId] = (clientCounts[clientId] || 0) + 1;
      }
    });

    return Object.values(clientCounts).filter((count: number) => count > 1).length;
  }

  private async getRatingTrend(userId: string): Promise<{ date: string; rating: number }[]> {
    // This would need historical rating data - placeholder
    const trend: { date: string; rating: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      trend.push({
        date: date.toISOString().split('T')[0],
        rating: 4.0 + Math.random() * 1 // Random rating between 4.0-5.0
      });
    }
    return trend;
  }

  private async getActivityTrend(userId: string): Promise<{ date: string; count: number }[]> {
    // Get activity count per month for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const activities = await Promise.all([
      this.proposalModel.aggregate([
        { $match: { freelancerId: userId, createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            count: { $sum: 1 }
          }
        }
      ]),
      this.projectModel.aggregate([
        { $match: { clientId: userId, createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const activityMap: { [key: string]: number } = {};
    activities.flat().forEach((activity: any) => {
      const key = `${activity._id.year}-${activity._id.month.toString().padStart(2, '0')}`;
      activityMap[key] = (activityMap[key] || 0) + activity.count;
    });

    const trend: { date: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      trend.push({
        date: key,
        count: activityMap[key] || 0
      });
    }

    return trend;
  }

  private async getPaymentHistory(userId: string): Promise<{ date: string; amount: number; type: string }[]> {
    const payments = await this.paymentModel.find({
      $or: [{ payerId: userId }, { payeeId: userId }],
      status: 'completed'
    }).sort({ createdAt: -1 }).limit(10);

    return payments.map((payment: any) => ({
      date: payment.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      amount: payment.amount || 0,
      type: payment.payerId?.toString() === userId ? 'payment' : 'earning'
    }));
  }

  // Freelancer-specific methods
  private async getPortfolioViews(userId: string): Promise<number> {
    return Math.floor(Math.random() * 500) + 50; // Placeholder
  }

  private async getBidSuccessRate(userId: string): Promise<number> {
    const totalProposals = await this.getProposalsSent(userId);
    const acceptedProposals = await this.getProposalsAccepted(userId);
    return totalProposals > 0 ? (acceptedProposals / totalProposals) * 100 : 0;
  }

  private async getAverageBidAmount(userId: string): Promise<number> {
    const proposals = await this.proposalModel.find({ freelancerId: userId }).select('proposedBudget');
    if (proposals.length === 0) return 0;

    const total = proposals.reduce((sum, proposal: any) => sum + (proposal.proposedBudget || 0), 0);
    return total / proposals.length;
  }

  private async getSpecializationScore(userId: string): Promise<number> {
    // Calculate based on skills, experience, and project completion
    const user = await this.userModel.findById(userId);
    const completedProjects = await this.getCompletedProjects(userId, true, false);

    let score = 0;
    if (user?.freelancerProfile?.skills?.length) {
      score += Math.min(user.freelancerProfile.skills.length * 5, 50);
    }
    if (user?.freelancerProfile?.experience === 'expert') score += 30;
    else if (user?.freelancerProfile?.experience === 'intermediate') score += 20;
    else if (user?.freelancerProfile?.experience === 'beginner') score += 10;

    score += Math.min(completedProjects * 2, 20);
    return Math.min(score, 100);
  }

  private async getClientRetentionRate(userId: string): Promise<number> {
    const totalClients = await this.contractModel.distinct('clientId', { freelancerId: userId });
    const repeatClients = await this.getRepeatClients(userId);
    return totalClients.length > 0 ? (repeatClients / totalClients.length) * 100 : 0;
  }

  // Client-specific methods
  private async getProjectsPosted(userId: string): Promise<number> {
    return await this.projectModel.countDocuments({ clientId: userId });
  }

  private async getAverageProjectBudget(userId: string): Promise<number> {
    const projects = await this.projectModel.find({ clientId: userId }).select('budget');
    if (projects.length === 0) return 0;

    const total = projects.reduce((sum, project: any) => sum + (project.budget || 0), 0);
    return total / projects.length;
  }

  private async getFreelancerRetentionRate(userId: string): Promise<number> {
    const totalFreelancers = await this.contractModel.distinct('freelancerId', { clientId: userId });
    const repeatFreelancers = await this.contractModel.aggregate([
      { $match: { clientId: userId } },
      { $group: { _id: '$freelancerId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'repeatCount' }
    ]);

    const repeatCount = (repeatFreelancers[0] as any)?.repeatCount || 0;
    return totalFreelancers.length > 0 ? (repeatCount / totalFreelancers.length) * 100 : 0;
  }

  private async getProjectSuccessRate(userId: string): Promise<number> {
    const totalProjects = await this.getProjectsPosted(userId);
    const completedProjects = await this.getCompletedProjects(userId, false, true);
    return totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;
  }

  private async getAverageTimeToHire(userId: string): Promise<number> {
    // Calculate average time from project creation to contract signing
    const contracts = await this.contractModel.find({ clientId: userId }).populate('projectId');
    if (contracts.length === 0) return 0;

    const totalTime = contracts.reduce((sum, contract: any) => {
      const project = contract.projectId as any;
      if (project?.createdAt && contract.createdAt) {
        const timeDiff = contract.createdAt.getTime() - project.createdAt.getTime();
        return sum + (timeDiff / (1000 * 60 * 60 * 24)); // Convert to days
      }
      return sum;
    }, 0);

    return totalTime / contracts.length;
  }

  private async getBudgetUtilization(userId: string): Promise<number> {
    const projects = await this.projectModel.find({ clientId: userId, status: 'completed' });
    if (projects.length === 0) return 0;

    const totalBudget = projects.reduce((sum, project: any) => sum + (project.budget || 0), 0);
    const totalSpent = await this.getTotalSpent(userId);

    return totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  }
}
