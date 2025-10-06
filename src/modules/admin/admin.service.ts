import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../database/schemas/user.schema';
import { Job } from '../../database/schemas/job.schema';
import { Contract } from '../../database/schemas/contract.schema';
import { Proposal } from '../../database/schemas/proposal.schema';
import { Payment } from '../../database/schemas/payment.schema';
import { Withdrawal } from '../../database/schemas/withdrawal.schema';
import { Review } from '../../database/schemas/review.schema';
import { Dispute } from '../../database/schemas/dispute.schema';
import { UserRole } from '../../common/enums/user-role.enum';
import { JobStatus } from '../../common/enums/job-status.enum';
import { ContractStatus } from '../../common/enums/contract-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { WithdrawalStatus } from '../../common/enums/withdrawal-status.enum';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Job.name) private jobModel: Model<Job>,
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    @InjectModel(Proposal.name) private proposalModel: Model<Proposal>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Withdrawal.name) private withdrawalModel: Model<Withdrawal>,
    @InjectModel(Review.name) private reviewModel: Model<Review>,
    @InjectModel(Dispute.name) private disputeModel: Model<Dispute>,
  ) {}

  // ============= DASHBOARD & STATISTICS =============

  async getAdminDashboard() {
    const [
      totalUsers,
      totalFreelancers,
      totalClients,
      activeUsers,
      totalJobs,
      activeJobs,
      totalContracts,
      activeContracts,
      totalRevenue,
      pendingWithdrawals,
      pendingDisputes,
    ] = await Promise.all([
      this.userModel.countDocuments({ deletedAt: null }),
      this.userModel.countDocuments({ role: UserRole.FREELANCER, deletedAt: null }),
      this.userModel.countDocuments({ role: UserRole.CLIENT, deletedAt: null }),
      this.userModel.countDocuments({ 
        isActive: true, 
        deletedAt: null,
        lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }),
      this.jobModel.countDocuments({ deletedAt: null }),
      this.jobModel.countDocuments({ status: JobStatus.OPEN, deletedAt: null }),
      this.contractModel.countDocuments({ deletedAt: null }),
      this.contractModel.countDocuments({ status: ContractStatus.ACTIVE, deletedAt: null }),
      this.calculateTotalRevenue(),
      this.withdrawalModel.countDocuments({ status: WithdrawalStatus.PENDING }),
      this.disputeModel.countDocuments({ status: 'pending' }),
    ]);

    return {
      users: {
        total: totalUsers,
        freelancers: totalFreelancers,
        clients: totalClients,
        active: activeUsers,
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
      },
      contracts: {
        total: totalContracts,
        active: activeContracts,
      },
      revenue: {
        total: totalRevenue,
        currency: 'USD',
      },
      pending: {
        withdrawals: pendingWithdrawals,
        disputes: pendingDisputes,
      },
    };
  }

  async getPlatformStatistics(startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const [
      userGrowth,
      jobStats,
      paymentStats,
      contractStats,
    ] = await Promise.all([
      this.getUserGrowthStats(dateFilter),
      this.getJobStats(dateFilter),
      this.getPaymentStats(dateFilter),
      this.getContractStats(dateFilter),
    ]);

    return {
      period: { startDate, endDate },
      userGrowth,
      jobStats,
      paymentStats,
      contractStats,
    };
  }

  async getRevenueAnalytics(
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate?: string,
    endDate?: string,
  ) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const groupBy = this.getGroupByPeriod(period);

    const revenueData = await this.paymentModel.aggregate([
      { $match: { status: PaymentStatus.COMPLETED, ...dateFilter } },
      {
        $group: {
          _id: groupBy,
          totalRevenue: { $sum: '$platformFee' },
          totalTransactions: { $sum: 1 },
          averageTransaction: { $avg: '$amount' },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    return {
      period,
      data: revenueData,
      totalRevenue: revenueData.reduce((sum, item) => sum + item.totalRevenue, 0),
      totalTransactions: revenueData.reduce((sum, item) => sum + item.totalTransactions, 0),
    };
  }

  async getSystemHealth() {
    const [
      failedPayments,
      failedWithdrawals,
      openDisputes,
      flaggedJobs,
      flaggedReviews,
    ] = await Promise.all([
      this.paymentModel.countDocuments({ status: PaymentStatus.FAILED }),
      this.withdrawalModel.countDocuments({ status: WithdrawalStatus.FAILED }),
      this.disputeModel.countDocuments({ status: 'pending' }),
      this.jobModel.countDocuments({ 'metadata.flagged': true }),
      this.reviewModel.countDocuments({ 'metadata.flagged': true }),
    ]);

    const healthScore = this.calculateHealthScore({
      failedPayments,
      failedWithdrawals,
      openDisputes,
      flaggedJobs,
      flaggedReviews,
    });

    return {
      status: healthScore > 80 ? 'healthy' : healthScore > 50 ? 'warning' : 'critical',
      score: healthScore,
      metrics: {
        failedPayments,
        failedWithdrawals,
        openDisputes,
        flaggedContent: flaggedJobs + flaggedReviews,
      },
      timestamp: new Date(),
    };
  }

  // ============= USER MANAGEMENT =============

  async getAllUsers(
    page: number,
    limit: number,
    role?: string,
    status?: string,
    search?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const skip = (page - 1) * limit;
    const query: any = { deletedAt: null };

    if (role) query.role = role;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('-password')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(query),
    ]);

    // Transform users to ensure _id is properly serialized as string
    const transformedUsers = users.map((user: any) => ({
      ...user,
      _id: user._id.toString(),
    }));

    return {
      users: transformedUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetails(id: string) {
    const user: any = await this.userModel.findById(id).select('-password').lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [
      jobsPosted,
      contractsAsClient,
      contractsAsFreelancer,
      totalSpent,
      totalEarned,
      reviews,
    ] = await Promise.all([
      this.jobModel.countDocuments({ clientId: id }),
      this.contractModel.countDocuments({ clientId: id }),
      this.contractModel.countDocuments({ freelancerId: id }),
      this.calculateUserSpending(id),
      this.calculateUserEarnings(id),
      this.reviewModel.find({ revieweeId: id }).limit(10).lean(),
    ]);

    // Transform reviews to ensure _id is properly serialized
    const transformedReviews = reviews.map((review: any) => ({
      ...review,
      _id: review._id.toString(),
    }));

    return {
      ...user,
      _id: user._id.toString(),
      statistics: {
        jobsPosted,
        contractsAsClient,
        contractsAsFreelancer,
        totalSpent,
        totalEarned,
        reviewCount: reviews.length,
      },
      recentReviews: transformedReviews,
    };
  }

  async suspendUser(id: string, reason: string, duration?: number) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const suspendedUntil = duration
      ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
      : undefined;

    await this.userModel.findByIdAndUpdate(id, {
      isActive: false,
      'metadata.suspended': true,
      'metadata.suspendedReason': reason,
      'metadata.suspendedAt': new Date(),
      'metadata.suspendedUntil': suspendedUntil,
    });

    this.logger.log(`User ${id} suspended by admin. Reason: ${reason}`);

    return {
      message: 'User suspended successfully',
      suspendedUntil,
    };
  }

  async activateUser(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userModel.findByIdAndUpdate(id, {
      isActive: true,
      $unset: {
        'metadata.suspended': '',
        'metadata.suspendedReason': '',
        'metadata.suspendedAt': '',
        'metadata.suspendedUntil': '',
      },
    });

    this.logger.log(`User ${id} activated by admin`);

    return { message: 'User activated successfully' };
  }

  async verifyUser(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userModel.findByIdAndUpdate(id, {
      isEmailVerified: true,
      'metadata.verifiedByAdmin': true,
      'metadata.verifiedAt': new Date(),
    });

    this.logger.log(`User ${id} verified by admin`);

    return { message: 'User verified successfully' };
  }

  async deleteUser(id: string, reason: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userModel.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      'metadata.deletedReason': reason,
      'metadata.deletedBy': 'admin',
    });

    this.logger.log(`User ${id} deleted by admin. Reason: ${reason}`);

    return { message: 'User deleted successfully' };
  }

  async getUserStatistics() {
    const [
      totalUsers,
      byRole,
      byStatus,
      recentSignups,
    ] = await Promise.all([
      this.userModel.countDocuments({ deletedAt: null }),
      this.userModel.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      this.userModel.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$isActive', count: { $sum: 1 } } },
      ]),
      this.userModel.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    return {
      total: totalUsers,
      byRole,
      byStatus,
      recentSignups,
    };
  }

  // ============= PAYMENT MANAGEMENT =============

  async getAllPayments(
    page: number,
    limit: number,
    status?: string,
    startDate?: string,
    endDate?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const skip = (page - 1) * limit;
    const query: any = { deletedAt: null };

    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [payments, total] = await Promise.all([
      this.paymentModel
        .find(query)
        .populate('payerId', 'email profile')
        .populate('payeeId', 'email profile')
        .populate('contractId', 'title')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.paymentModel.countDocuments(query),
    ]);

    return {
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getFailedPayments(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.paymentModel
        .find({ status: PaymentStatus.FAILED })
        .populate('payerId', 'email profile')
        .populate('payeeId', 'email profile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.paymentModel.countDocuments({ status: PaymentStatus.FAILED }),
    ]);

    return {
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentStatistics() {
    const stats = await this.paymentModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          platformFees: { $sum: '$platformFee' },
        },
      },
    ]);

    return {
      byStatus: stats,
      totalRevenue: stats
        .filter(s => s._id === PaymentStatus.COMPLETED)
        .reduce((sum, s) => sum + s.platformFees, 0),
    };
  }

  async refundPayment(id: string, reason: string, amount?: number) {
    const payment = await this.paymentModel.findById(id);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    // Logic to process refund would go here (Stripe API call, etc.)
    await this.paymentModel.findByIdAndUpdate(id, {
      status: PaymentStatus.REFUNDED,
      'metadata.refundReason': reason,
      'metadata.refundAmount': amount || payment.amount,
      'metadata.refundedAt': new Date(),
      'metadata.refundedBy': 'admin',
    });

    this.logger.log(`Payment ${id} refunded by admin. Reason: ${reason}`);

    return {
      message: 'Payment refunded successfully',
      refundAmount: amount || payment.amount,
    };
  }

  // ============= WITHDRAWAL MANAGEMENT =============

  async getAllWithdrawals(page: number, limit: number, status?: string) {
    const skip = (page - 1) * limit;
    const query: any = { deletedAt: null };

    if (status) query.status = status;

    const [withdrawals, total] = await Promise.all([
      this.withdrawalModel
        .find(query)
        .populate('freelancerId', 'email profile')
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.withdrawalModel.countDocuments(query),
    ]);

    return {
      withdrawals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPendingWithdrawals() {
    const withdrawals = await this.withdrawalModel
      .find({ status: WithdrawalStatus.PENDING })
      .populate('freelancerId', 'email profile')
      .sort({ requestedAt: 1 })
      .lean();

    return {
      withdrawals,
      count: withdrawals.length,
      totalAmount: withdrawals.reduce((sum, w) => sum + w.amount, 0),
    };
  }

  async getWithdrawalStatistics() {
    const stats = await this.withdrawalModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    return { byStatus: stats };
  }

  // ============= JOB MANAGEMENT =============

  async getAllJobs(page: number, limit: number, status?: string, flagged?: boolean) {
    const skip = (page - 1) * limit;
    const query: any = { deletedAt: null };

    if (status) query.status = status;
    if (flagged !== undefined) query['metadata.flagged'] = flagged;

    const [jobs, total] = await Promise.all([
      this.jobModel
        .find(query)
        .populate('clientId', 'email profile')
        .populate('categoryId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.jobModel.countDocuments(query),
    ]);

    return {
      jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async flagJob(id: string, reason: string) {
    const job = await this.jobModel.findById(id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    await this.jobModel.findByIdAndUpdate(id, {
      'metadata.flagged': true,
      'metadata.flaggedReason': reason,
      'metadata.flaggedAt': new Date(),
      'metadata.flaggedBy': 'admin',
    });

    this.logger.log(`Job ${id} flagged by admin. Reason: ${reason}`);

    return { message: 'Job flagged successfully' };
  }

  async unflagJob(id: string) {
    const job = await this.jobModel.findById(id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    await this.jobModel.findByIdAndUpdate(id, {
      $unset: {
        'metadata.flagged': '',
        'metadata.flaggedReason': '',
        'metadata.flaggedAt': '',
        'metadata.flaggedBy': '',
      },
    });

    this.logger.log(`Job ${id} unflagged by admin`);

    return { message: 'Job unflagged successfully' };
  }

  async deleteJob(id: string, reason: string) {
    const job = await this.jobModel.findById(id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    await this.jobModel.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      'metadata.deletedReason': reason,
      'metadata.deletedBy': 'admin',
    });

    this.logger.log(`Job ${id} deleted by admin. Reason: ${reason}`);

    return { message: 'Job deleted successfully' };
  }

  // ============= CONTRACT MANAGEMENT =============

  async getAllContracts(page: number, limit: number, status?: string) {
    const skip = (page - 1) * limit;
    const query: any = { deletedAt: null };

    if (status) query.status = status;

    const [contracts, total] = await Promise.all([
      this.contractModel
        .find(query)
        .populate('clientId', 'email profile')
        .populate('freelancerId', 'email profile')
        .populate('jobId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.contractModel.countDocuments(query),
    ]);

    return {
      contracts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getContractStatistics() {
    const stats = await this.contractModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
    ]);

    return { byStatus: stats };
  }

  async cancelContract(id: string, reason: string) {
    const contract = await this.contractModel.findById(id);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    await this.contractModel.findByIdAndUpdate(id, {
      status: ContractStatus.CANCELLED,
      'metadata.cancelledReason': reason,
      'metadata.cancelledBy': 'admin',
      cancelledAt: new Date(),
    });

    this.logger.log(`Contract ${id} cancelled by admin. Reason: ${reason}`);

    return { message: 'Contract cancelled successfully' };
  }

  // ============= PROPOSAL MANAGEMENT =============

  async getAllProposals(page: number, limit: number, status?: string) {
    const skip = (page - 1) * limit;
    const query: any = { deletedAt: null };

    if (status) query.status = status;

    const [proposals, total] = await Promise.all([
      this.proposalModel
        .find(query)
        .populate('freelancerId', 'email profile')
        .populate('jobId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.proposalModel.countDocuments(query),
    ]);

    return {
      proposals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============= DISPUTE MANAGEMENT =============

  async getAllDisputes(page: number, limit: number, status?: string) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (status) query.status = status;

    const [disputes, total] = await Promise.all([
      this.disputeModel
        .find(query)
        .populate('raisedBy', 'email profile')
        .populate('againstUser', 'email profile')
        .populate('contractId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.disputeModel.countDocuments(query),
    ]);

    return {
      disputes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPendingDisputes() {
    const disputes = await this.disputeModel
      .find({ status: 'pending' })
      .populate('raisedBy', 'email profile')
      .populate('againstUser', 'email profile')
      .populate('contractId', 'title')
      .sort({ createdAt: 1 })
      .lean();

    return {
      disputes,
      count: disputes.length,
    };
  }

  async resolveDispute(id: string, resolution: string, favoredParty: string, refundAmount?: number) {
    const dispute = await this.disputeModel.findById(id);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    await this.disputeModel.findByIdAndUpdate(id, {
      status: 'resolved',
      resolution,
      favoredParty,
      refundAmount,
      resolvedAt: new Date(),
      resolvedBy: 'admin',
    });

    this.logger.log(`Dispute ${id} resolved by admin. Favored party: ${favoredParty}`);

    return {
      message: 'Dispute resolved successfully',
      resolution,
      favoredParty,
    };
  }

  async escalateDispute(id: string, notes?: string) {
    const dispute = await this.disputeModel.findById(id);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    await this.disputeModel.findByIdAndUpdate(id, {
      status: 'escalated',
      'metadata.escalatedAt': new Date(),
      'metadata.escalatedBy': 'admin',
      'metadata.escalationNotes': notes,
    });

    this.logger.log(`Dispute ${id} escalated by admin`);

    return { message: 'Dispute escalated successfully' };
  }

  // ============= REVIEW MANAGEMENT =============

  async getAllReviews(page: number, limit: number, flagged?: boolean) {
    const skip = (page - 1) * limit;
    const query: any = { deletedAt: null };

    if (flagged !== undefined) query['metadata.flagged'] = flagged;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find(query)
        .populate('reviewerId', 'email profile')
        .populate('revieweeId', 'email profile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.reviewModel.countDocuments(query),
    ]);

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async flagReview(id: string, reason: string) {
    const review = await this.reviewModel.findById(id);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.reviewModel.findByIdAndUpdate(id, {
      'metadata.flagged': true,
      'metadata.flaggedReason': reason,
      'metadata.flaggedAt': new Date(),
      'metadata.flaggedBy': 'admin',
    });

    this.logger.log(`Review ${id} flagged by admin. Reason: ${reason}`);

    return { message: 'Review flagged successfully' };
  }

  async deleteReview(id: string, reason: string) {
    const review = await this.reviewModel.findById(id);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.reviewModel.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      'metadata.deletedReason': reason,
      'metadata.deletedBy': 'admin',
    });

    this.logger.log(`Review ${id} deleted by admin. Reason: ${reason}`);

    return { message: 'Review deleted successfully' };
  }

  // ============= REPORTS & ANALYTICS =============

  async getUsersReport(startDate?: string, endDate?: string, format: 'json' | 'csv' = 'json') {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const users = await this.userModel
      .find({ ...dateFilter, deletedAt: null })
      .select('-password')
      .lean();

    if (format === 'csv') {
      // Convert to CSV format (simplified)
      return {
        format: 'csv',
        data: users,
        message: 'CSV export not fully implemented. Use JSON format.',
      };
    }

    return {
      users,
      count: users.length,
      period: { startDate, endDate },
    };
  }

  async getRevenueReport(startDate?: string, endDate?: string, format: 'json' | 'csv' = 'json') {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const revenue = await this.paymentModel.aggregate([
      { $match: { status: PaymentStatus.COMPLETED, ...dateFilter } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalRevenue: { $sum: '$platformFee' },
          totalTransactions: { $sum: 1 },
          averageTransaction: { $avg: '$amount' },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    return {
      revenue,
      totalRevenue: revenue.reduce((sum, r) => sum + r.totalRevenue, 0),
      period: { startDate, endDate },
    };
  }

  async getTransactionsReport(startDate?: string, endDate?: string, format: 'json' | 'csv' = 'json') {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const transactions = await this.paymentModel
      .find(dateFilter)
      .populate('payerId', 'email')
      .populate('payeeId', 'email')
      .lean();

    return {
      transactions,
      count: transactions.length,
      period: { startDate, endDate },
    };
  }

  // ============= SETTINGS & CONFIGURATION =============

  async getPlatformSettings() {
    // In a real app, this would fetch from a settings collection
    return {
      platformName: 'FreelanceHub',
      platformFeePercentage: 10,
      maintenanceMode: false,
      registrationEnabled: true,
      minimumWithdrawal: 10,
      maximumPendingWithdrawals: 3,
    };
  }

  async updatePlatformSettings(settings: any) {
    // In a real app, this would update a settings collection
    this.logger.log(`Platform settings updated by admin`);

    return {
      message: 'Platform settings updated successfully',
      settings,
    };
  }

  async getFeeSettings() {
    return {
      platformFeePercentage: 10,
      withdrawalFees: {
        bankTransfer: 2,
        paypal: 2.9,
        stripe: 2.9,
      },
    };
  }

  async updateFeeSettings(fees: any) {
    this.logger.log(`Fee settings updated by admin`);

    return {
      message: 'Fee settings updated successfully',
      fees,
    };
  }

  // ============= ACTIVITY LOGS =============

  async getActivityLogs(
    page: number,
    limit: number,
    userId?: string,
    action?: string,
    startDate?: string,
    endDate?: string,
  ) {
    // In a real app, this would fetch from an activity log collection
    return {
      logs: [],
      message: 'Activity logging not fully implemented',
      pagination: {
        total: 0,
        page,
        limit,
        totalPages: 0,
      },
    };
  }

  async getErrorLogs(page: number, limit: number, severity?: string) {
    // In a real app, this would fetch from an error log collection
    return {
      logs: [],
      message: 'Error logging not fully implemented',
      pagination: {
        total: 0,
        page,
        limit,
        totalPages: 0,
      },
    };
  }

  // ============= HELPER METHODS =============

  private buildDateFilter(startDate?: string, endDate?: string) {
    const filter: any = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    return filter;
  }

  private getGroupByPeriod(period: 'daily' | 'weekly' | 'monthly' | 'yearly') {
    switch (period) {
      case 'daily':
        return { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
      case 'weekly':
        return { $dateToString: { format: '%Y-W%U', date: '$createdAt' } };
      case 'monthly':
        return { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
      case 'yearly':
        return { $dateToString: { format: '%Y', date: '$createdAt' } };
      default:
        return { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    }
  }

  private async calculateTotalRevenue() {
    const result = await this.paymentModel.aggregate([
      { $match: { status: PaymentStatus.COMPLETED } },
      { $group: { _id: null, total: { $sum: '$platformFee' } } },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  private async getUserGrowthStats(dateFilter: any) {
    return this.userModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          newUsers: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
    ]);
  }

  private async getJobStats(dateFilter: any) {
    return {
      created: await this.jobModel.countDocuments(dateFilter),
      completed: await this.jobModel.countDocuments({ ...dateFilter, status: JobStatus.COMPLETED }),
    };
  }

  private async getPaymentStats(dateFilter: any) {
    const stats = await this.paymentModel.aggregate([
      { $match: { ...dateFilter, status: PaymentStatus.COMPLETED } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$platformFee' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    return stats[0] || { totalRevenue: 0, totalTransactions: 0 };
  }

  private async getContractStats(dateFilter: any) {
    return {
      created: await this.contractModel.countDocuments(dateFilter),
      active: await this.contractModel.countDocuments({ ...dateFilter, status: ContractStatus.ACTIVE }),
      completed: await this.contractModel.countDocuments({ ...dateFilter, status: ContractStatus.COMPLETED }),
    };
  }

  private async calculateUserSpending(userId: string) {
    const result = await this.paymentModel.aggregate([
      { $match: { payerId: new Types.ObjectId(userId), status: PaymentStatus.COMPLETED } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  private async calculateUserEarnings(userId: string) {
    const result = await this.paymentModel.aggregate([
      { $match: { payeeId: new Types.ObjectId(userId), status: PaymentStatus.COMPLETED } },
      { $group: { _id: null, total: { $sum: '$freelancerAmount' } } },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  private calculateHealthScore(metrics: {
    failedPayments: number;
    failedWithdrawals: number;
    openDisputes: number;
    flaggedJobs: number;
    flaggedReviews: number;
  }) {
    // Simple health score calculation (0-100)
    let score = 100;

    score -= Math.min(metrics.failedPayments * 2, 20);
    score -= Math.min(metrics.failedWithdrawals * 2, 20);
    score -= Math.min(metrics.openDisputes * 3, 30);
    score -= Math.min(metrics.flaggedJobs * 1, 15);
    score -= Math.min(metrics.flaggedReviews * 1, 15);

    return Math.max(score, 0);
  }
}
