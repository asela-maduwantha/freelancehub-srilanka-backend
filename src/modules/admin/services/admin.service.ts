import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Project, ProjectDocument } from '../../projects/schemas/project.schema';
import { Contract, ContractDocument } from '../../contracts/schemas/contract.schema';
import { Payment, PaymentDocument } from '../../payments/schemas/payment.schema';
import { Dispute, DisputeDocument } from '../../disputes/schemas/dispute.schema';
import { Review, ReviewDocument } from '../../reviews/schemas/review.schema';
import { UpdateUserStatusDto, ApproveProjectDto, UpdateSystemSettingsDto } from '../dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Dispute.name) private disputeModel: Model<DisputeDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
  ) {}

  // User Management
  async getAllUsers(filters: any = {}, pagination: any = {}) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const query = this.buildUserQuery(filters);

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('-password -otpCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('stats'),
      this.userModel.countDocuments(query),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateUserStatus(userId: string, updateUserStatusDto: UpdateUserStatusDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { status, reason } = updateUserStatusDto;

    // Update user status
    user.status = status;

    // If suspending or banning, you might want to cancel active contracts
    if (status === 'suspended' || status === 'banned') {
      await this.handleUserSuspension(userId, reason || 'Administrative action');
    }

    await user.save();

    return {
      message: `User status updated to ${status}`,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
      },
    };
  }

  async getUserDetails(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password -otpCode')
      .populate('stats');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user's activity
    const [projects, contracts, reviews] = await Promise.all([
      this.projectModel.countDocuments({ clientId: userId }),
      this.contractModel.countDocuments({
        $or: [{ clientId: userId }, { freelancerId: userId }],
      }),
      this.reviewModel.countDocuments({
        $or: [{ reviewerId: userId }, { revieweeId: userId }],
      }),
    ]);

    return {
      user,
      activity: {
        totalProjects: projects,
        totalContracts: contracts,
        totalReviews: reviews,
      },
    };
  }

  // Platform Statistics
  async getDashboardStats() {
    const [
      totalUsers,
      totalProjects,
      totalContracts,
      totalPayments,
      totalRevenue,
      activeDisputes,
      recentUsers,
      recentProjects,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.projectModel.countDocuments(),
      this.contractModel.countDocuments(),
      this.paymentModel.countDocuments({ status: 'completed' }),
      this.paymentModel.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.disputeModel.countDocuments({ status: { $in: ['open', 'under-review'] } }),
      this.userModel
        .find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName lastName email createdAt'),
      this.projectModel
        .find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title status createdAt')
        .populate('clientId', 'firstName lastName'),
    ]);

    const revenue = totalRevenue[0]?.total || 0;

    // Calculate growth metrics (simplified - in real app you'd compare with previous period)
    const userGrowth = await this.calculateGrowth(this.userModel, 30);
    const projectGrowth = await this.calculateGrowth(this.projectModel, 30);

    return {
      overview: {
        totalUsers,
        totalProjects,
        totalContracts,
        totalPayments,
        totalRevenue: revenue,
        activeDisputes,
      },
      growth: {
        users: userGrowth,
        projects: projectGrowth,
      },
      recent: {
        users: recentUsers,
        projects: recentProjects,
      },
    };
  }

  async getRevenueStats(period: string = 'month') {
    const pipeline = this.buildRevenuePipeline(period);

    const revenueStats = await this.paymentModel.aggregate(pipeline as any);

    return {
      period,
      data: revenueStats,
      summary: {
        totalRevenue: revenueStats.reduce((sum, stat) => sum + stat.revenue, 0),
        totalTransactions: revenueStats.reduce((sum, stat) => sum + stat.transactions, 0),
      },
    };
  }

  async getUserStats() {
    const userStats = await this.userModel.aggregate([
      {
        $group: {
          _id: '$activeRole',
          count: { $sum: 1 },
          verified: {
            $sum: { $cond: ['$emailVerified', 1, 0] },
          },
        },
      },
    ]);

    const locationStats = await this.userModel.aggregate([
      {
        $group: {
          _id: '$location.country',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    return {
      byRole: userStats,
      byLocation: locationStats,
    };
  }

  // Content Moderation
  async getPendingProjects() {
    return this.projectModel
      .find({ status: 'draft' })
      .populate('clientId', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }

  async approveProject(projectId: string, approveProjectDto: ApproveProjectDto) {
    const project = await this.projectModel.findById(projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.status !== 'draft') {
      throw new BadRequestException('Project is not pending approval');
    }

    project.status = 'open';
    await project.save();

    return {
      message: 'Project approved successfully',
      project,
    };
  }

  async rejectProject(projectId: string, reason: string) {
    const project = await this.projectModel.findById(projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.status !== 'draft') {
      throw new BadRequestException('Project is not pending approval');
    }

    project.status = 'cancelled';
    await project.save();

    return {
      message: 'Project rejected',
      reason,
    };
  }

  async getReportedContent() {
    // This would typically involve a separate reports collection
    // For now, return disputes as reported content
    return this.disputeModel
      .find({ status: 'open' })
      .populate('contractId', 'title')
      .populate('initiatorId', 'firstName lastName')
      .sort({ createdAt: -1 });
  }

  // System Configuration
  async updateSystemSettings(updateSystemSettingsDto: UpdateSystemSettingsDto) {
    // This would typically update a settings collection or config file
    // For now, we'll just validate and return success
    const { platformFee, maxFileSize, allowedFileTypes } = updateSystemSettingsDto;

    // Validate settings
    if (platformFee !== undefined && (platformFee < 0 || platformFee > 50)) {
      throw new BadRequestException('Platform fee must be between 0 and 50 percent');
    }

    if (maxFileSize !== undefined && (maxFileSize < 1024 || maxFileSize > 100 * 1024 * 1024)) {
      throw new BadRequestException('Max file size must be between 1KB and 100MB');
    }

    // In a real application, you'd save these to a database
    return {
      message: 'System settings updated successfully',
      settings: {
        platformFee,
        maxFileSize,
        allowedFileTypes,
      },
    };
  }

  async getSystemSettings() {
    // Return default settings - in real app, fetch from database
    return {
      platformFee: 10, // 10%
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      features: {
        emailNotifications: true,
        fileUploads: true,
        payments: true,
      },
    };
  }

  // Helper methods
  private buildUserQuery(filters: any) {
    const query: any = {};

    if (filters.role) {
      query.activeRole = filters.role;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.email) {
      query.email = new RegExp(filters.email, 'i');
    }

    if (filters.createdAfter) {
      query.createdAt = { $gte: new Date(filters.createdAfter) };
    }

    return query;
  }

  private async calculateGrowth(model: Model<any>, days: number) {
    const now = new Date();
    const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [current, previous] = await Promise.all([
      model.countDocuments({ createdAt: { $gte: pastDate } }),
      model.countDocuments({
        createdAt: { $gte: new Date(pastDate.getTime() - days * 24 * 60 * 60 * 1000), $lt: pastDate }
      }),
    ]);

    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  private buildRevenuePipeline(period: string) {
    const groupBy = this.getGroupByForPeriod(period);

    return [
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
    ];
  }

  private getGroupByForPeriod(period: string) {
    const now = new Date();

    switch (period) {
      case 'day':
        return {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
      case 'week':
        return {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
      case 'month':
      default:
        return {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
    }
  }

  private async handleUserSuspension(userId: string, reason: string) {
    // Cancel active contracts
    await this.contractModel.updateMany(
      {
        $or: [{ clientId: userId }, { freelancerId: userId }],
        status: 'active',
      },
      {
        status: 'cancelled',
        cancellationReason: `Account suspended: ${reason}`,
      }
    );

    // Cancel pending projects
    await this.projectModel.updateMany(
      { clientId: userId, status: { $in: ['draft', 'open'] } },
      { status: 'cancelled' }
    );
  }
}
