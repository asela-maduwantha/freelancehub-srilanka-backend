import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TransactionLog } from '../../database/schemas/transaction-log.schema';
import { v4 as uuidv4 } from 'uuid';

export interface CreateTransactionLogDto {
  transactionId?: string;
  type: 'payment' | 'refund' | 'withdrawal' | 'fee' | 'bonus';
  fromUserId?: Types.ObjectId;
  toUserId?: Types.ObjectId;
  amount: number;
  currency?: string;
  fee?: number;
  netAmount: number;
  relatedId?: Types.ObjectId;
  relatedType?: 'contract' | 'milestone' | 'withdrawal' | 'dispute';
  stripeId?: string;
  chargeId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UpdateTransactionLogDto {
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  stripeId?: string;
  chargeId?: string;
  description?: string;
  metadata?: Record<string, any>;
  errorMessage?: string;
}

export interface TransactionLogFilters {
  type?: string;
  fromUserId?: Types.ObjectId;
  toUserId?: Types.ObjectId;
  status?: string;
  relatedType?: string;
  relatedId?: Types.ObjectId;
  amountRange?: {
    min: number;
    max: number;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface TransactionSummary {
  totalTransactions: number;
  totalAmount: number;
  totalFees: number;
  totalNetAmount: number;
  typeBreakdown: Record<string, { count: number; amount: number }>;
  statusBreakdown: Record<string, number>;
}

@Injectable()
export class TransactionLogService {
  private readonly logger = new Logger(TransactionLogService.name);

  constructor(
    @InjectModel(TransactionLog.name) private transactionLogModel: Model<TransactionLog>,
  ) {}

  async create(createTransactionLogDto: CreateTransactionLogDto): Promise<TransactionLog> {
    try {
      const transactionLog = new this.transactionLogModel({
        ...createTransactionLogDto,
        transactionId: createTransactionLogDto.transactionId || this.generateTransactionId(),
        currency: createTransactionLogDto.currency || 'USD',
        fee: createTransactionLogDto.fee || 0,
      });

      const savedTransactionLog = await transactionLog.save();
      this.logger.log(`Transaction log created: ${savedTransactionLog.transactionId}`);
      return savedTransactionLog;
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('Transaction ID already exists');
      }
      this.logger.error(`Failed to create transaction log: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create transaction log');
    }
  }

  async findById(id: string): Promise<TransactionLog> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid transaction log ID');
    }

    const transactionLog = await this.transactionLogModel
      .findOne({ _id: id, deletedAt: null })
      .populate('fromUserId', 'firstName lastName email')
      .populate('toUserId', 'firstName lastName email')
      .exec();

    if (!transactionLog) {
      throw new NotFoundException('Transaction log not found');
    }

    return transactionLog;
  }

  async findByTransactionId(transactionId: string): Promise<TransactionLog> {
    const transactionLog = await this.transactionLogModel
      .findOne({ transactionId, deletedAt: null })
      .populate('fromUserId', 'firstName lastName email')
      .populate('toUserId', 'firstName lastName email')
      .exec();

    if (!transactionLog) {
      throw new NotFoundException('Transaction log not found');
    }

    return transactionLog;
  }

  async findAll(
    filters: TransactionLogFilters = {},
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<{ transactionLogs: TransactionLog[]; total: number; totalPages: number }> {
    const query: any = { deletedAt: null };

    // Apply filters
    if (filters.type) query.type = filters.type;
    if (filters.fromUserId) query.fromUserId = filters.fromUserId;
    if (filters.toUserId) query.toUserId = filters.toUserId;
    if (filters.status) query.status = filters.status;
    if (filters.relatedType) query.relatedType = filters.relatedType;
    if (filters.relatedId) query.relatedId = filters.relatedId;

    if (filters.amountRange) {
      query.amount = {
        $gte: filters.amountRange.min,
        $lte: filters.amountRange.max,
      };
    }

    if (filters.dateRange) {
      query.createdAt = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end,
      };
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [transactionLogs, total] = await Promise.all([
      this.transactionLogModel
        .find(query)
        .populate('fromUserId', 'firstName lastName email')
        .populate('toUserId', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionLogModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return { transactionLogs, total, totalPages };
  }

  async updateById(id: string, updateTransactionLogDto: UpdateTransactionLogDto): Promise<TransactionLog> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid transaction log ID');
    }

    const updateData: any = { ...updateTransactionLogDto };

    // Set processedAt timestamp if status is being updated to completed
    if (updateTransactionLogDto.status === 'completed') {
      updateData.processedAt = new Date();
    }

    const transactionLog = await this.transactionLogModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        updateData,
        { new: true }
      )
      .populate('fromUserId', 'firstName lastName email')
      .populate('toUserId', 'firstName lastName email')
      .exec();

    if (!transactionLog) {
      throw new NotFoundException('Transaction log not found');
    }

    this.logger.log(`Transaction log updated: ${transactionLog.transactionId}`);
    return transactionLog;
  }

  async updateByTransactionId(transactionId: string, updateTransactionLogDto: UpdateTransactionLogDto): Promise<TransactionLog> {
    const updateData: any = { ...updateTransactionLogDto };

    // Set processedAt timestamp if status is being updated to completed
    if (updateTransactionLogDto.status === 'completed') {
      updateData.processedAt = new Date();
    }

    const transactionLog = await this.transactionLogModel
      .findOneAndUpdate(
        { transactionId, deletedAt: null },
        updateData,
        { new: true }
      )
      .populate('fromUserId', 'firstName lastName email')
      .populate('toUserId', 'firstName lastName email')
      .exec();

    if (!transactionLog) {
      throw new NotFoundException('Transaction log not found');
    }

    this.logger.log(`Transaction log updated: ${transactionLog.transactionId}`);
    return transactionLog;
  }

  async updateByStripeId(stripeId: string, updateTransactionLogDto: UpdateTransactionLogDto): Promise<TransactionLog> {
    const updateData: any = { ...updateTransactionLogDto };

    // Set processedAt timestamp if status is being updated to completed
    if (updateTransactionLogDto.status === 'completed') {
      updateData.processedAt = new Date();
    }

    const transactionLog = await this.transactionLogModel
      .findOneAndUpdate(
        { stripeId, deletedAt: null },
        updateData,
        { new: true }
      )
      .populate('fromUserId', 'firstName lastName email')
      .populate('toUserId', 'firstName lastName email')
      .exec();

    if (!transactionLog) {
      throw new NotFoundException('Transaction log not found');
    }

    this.logger.log(`Transaction log updated by Stripe ID: ${transactionLog.transactionId}`);
    return transactionLog;
  }

  async deleteById(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid transaction log ID');
    }

    const transactionLog = await this.transactionLogModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { deletedAt: new Date() },
        { new: true }
      )
      .exec();

    if (!transactionLog) {
      throw new NotFoundException('Transaction log not found');
    }

    this.logger.log(`Transaction log soft deleted: ${transactionLog.transactionId}`);
  }

  // User-specific methods
  async findByUserId(
    userId: string,
    type: 'from' | 'to' | 'both' = 'both',
    page: number = 1,
    limit: number = 10
  ): Promise<{ transactionLogs: TransactionLog[]; total: number; totalPages: number }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const userObjectId = new Types.ObjectId(userId);
    let query: any = { deletedAt: null };

    switch (type) {
      case 'from':
        query.fromUserId = userObjectId;
        break;
      case 'to':
        query.toUserId = userObjectId;
        break;
      case 'both':
        query.$or = [
          { fromUserId: userObjectId },
          { toUserId: userObjectId }
        ];
        break;
    }

    const skip = (page - 1) * limit;

    const [transactionLogs, total] = await Promise.all([
      this.transactionLogModel
        .find(query)
        .populate('fromUserId', 'firstName lastName email')
        .populate('toUserId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionLogModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return { transactionLogs, total, totalPages };
  }

  async getUserTransactionSummary(
    userId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<TransactionSummary> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const userObjectId = new Types.ObjectId(userId);
    const matchQuery: any = {
      $or: [
        { fromUserId: userObjectId },
        { toUserId: userObjectId }
      ],
      deletedAt: null,
    };

    if (dateRange) {
      matchQuery.createdAt = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const [summaryResult, typeBreakdownResult, statusBreakdownResult] = await Promise.all([
      this.transactionLogModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            totalFees: { $sum: '$fee' },
            totalNetAmount: { $sum: '$netAmount' },
          },
        },
      ]),
      this.transactionLogModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),
      this.transactionLogModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = summaryResult.length > 0 ? summaryResult[0] : {
      totalTransactions: 0,
      totalAmount: 0,
      totalFees: 0,
      totalNetAmount: 0,
    };

    const typeBreakdown: Record<string, { count: number; amount: number }> = {};
    typeBreakdownResult.forEach(item => {
      typeBreakdown[item._id] = {
        count: item.count,
        amount: item.amount,
      };
    });

    const statusBreakdown: Record<string, number> = {};
    statusBreakdownResult.forEach(item => {
      statusBreakdown[item._id] = item.count;
    });

    return {
      ...summary,
      typeBreakdown,
      statusBreakdown,
    };
  }

  // Related entity methods
  async findByRelatedEntity(
    relatedId: string,
    relatedType: 'contract' | 'milestone' | 'withdrawal' | 'dispute'
  ): Promise<TransactionLog[]> {
    if (!Types.ObjectId.isValid(relatedId)) {
      throw new BadRequestException('Invalid related entity ID');
    }

    return this.transactionLogModel
      .find({
        relatedId: new Types.ObjectId(relatedId),
        relatedType,
        deletedAt: null,
      })
      .populate('fromUserId', 'firstName lastName email')
      .populate('toUserId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateByRelatedEntity(
    relatedId: string,
    relatedType: 'contract' | 'milestone' | 'withdrawal' | 'dispute',
    updateTransactionLogDto: UpdateTransactionLogDto
  ): Promise<void> {
    if (!Types.ObjectId.isValid(relatedId)) {
      throw new BadRequestException('Invalid related entity ID');
    }

    await this.transactionLogModel.updateMany(
      {
        relatedId: new Types.ObjectId(relatedId),
        relatedType,
        deletedAt: null,
      },
      {
        ...updateTransactionLogDto,
        updatedAt: new Date(),
      }
    ).exec();
  }

  async getTotalAmountByType(
    type: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<number> {
    const matchQuery: any = {
      type,
      status: 'completed',
      deletedAt: null,
    };

    if (dateRange) {
      matchQuery.createdAt = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const result = await this.transactionLogModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  async getRecentTransactions(
    limit: number = 10,
    userId?: string
  ): Promise<TransactionLog[]> {
    const query: any = { deletedAt: null };

    if (userId) {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }
      const userObjectId = new Types.ObjectId(userId);
      query.$or = [
        { fromUserId: userObjectId },
        { toUserId: userObjectId }
      ];
    }

    return this.transactionLogModel
      .find(query)
      .populate('fromUserId', 'firstName lastName email')
      .populate('toUserId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getTransactionsByDateRange(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<Array<{ date: string; count: number; totalAmount: number }>> {
    const groupByFormat = {
      day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      week: { $dateToString: { format: '%Y-%U', date: '$createdAt' } },
      month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
    };

    const result = await this.transactionLogModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: groupByFormat[groupBy],
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          date: '$_id',
          count: 1,
          totalAmount: 1,
          _id: 0,
        },
      },
    ]);

    return result;
  }

  async getPendingTransactions(): Promise<TransactionLog[]> {
    return this.transactionLogModel
      .find({
        status: 'pending',
        deletedAt: null,
      })
      .populate('fromUserId', 'firstName lastName email')
      .populate('toUserId', 'firstName lastName email')
      .sort({ createdAt: 1 })
      .exec();
  }

  async getFailedTransactions(limit?: number): Promise<TransactionLog[]> {
    const query = this.transactionLogModel
      .find({
        status: 'failed',
        deletedAt: null,
      })
      .populate('fromUserId', 'firstName lastName email')
      .populate('toUserId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    if (limit) {
      query.limit(limit);
    }

    return query.exec();
  }

  async getTransactionVolumeStats(
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalVolume: number;
    totalFees: number;
    totalTransactions: number;
    averageTransaction: number;
    volumeByType: Record<string, number>;
    volumeByStatus: Record<string, number>;
  }> {
    const matchQuery: any = { deletedAt: null };

    if (dateRange) {
      matchQuery.createdAt = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const [volumeResult, typeVolumeResult, statusVolumeResult] = await Promise.all([
      this.transactionLogModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalVolume: { $sum: '$amount' },
            totalFees: { $sum: '$fee' },
            totalTransactions: { $sum: 1 },
          },
        },
      ]),
      this.transactionLogModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$type',
            volume: { $sum: '$amount' },
          },
        },
      ]),
      this.transactionLogModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$status',
            volume: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const volumeStats = volumeResult.length > 0 ? volumeResult[0] : {
      totalVolume: 0,
      totalFees: 0,
      totalTransactions: 0,
    };

    const volumeByType: Record<string, number> = {};
    typeVolumeResult.forEach(item => {
      volumeByType[item._id] = item.volume;
    });

    const volumeByStatus: Record<string, number> = {};
    statusVolumeResult.forEach(item => {
      volumeByStatus[item._id] = item.volume;
    });

    const averageTransaction = volumeStats.totalTransactions > 0
      ? volumeStats.totalVolume / volumeStats.totalTransactions
      : 0;

    return {
      ...volumeStats,
      averageTransaction,
      volumeByType,
      volumeByStatus,
    };
  }

  async markAsCompleted(transactionId: string, stripeId?: string): Promise<TransactionLog> {
    return this.updateByTransactionId(transactionId, {
      status: 'completed',
      stripeId,
    });
  }

  async markAsFailed(transactionId: string, errorMessage?: string): Promise<TransactionLog> {
    return this.updateByTransactionId(transactionId, {
      status: 'failed',
      metadata: { errorMessage },
    });
  }

  async bulkUpdateStatus(
    transactionIds: string[],
    status: 'pending' | 'completed' | 'failed' | 'cancelled'
  ): Promise<{ modifiedCount: number }> {
    const updateData: any = { status };

    if (status === 'completed') {
      updateData.processedAt = new Date();
    }

    const result = await this.transactionLogModel.updateMany(
      {
        transactionId: { $in: transactionIds },
        deletedAt: null,
      },
      updateData
    );

    this.logger.log(`Bulk updated ${result.modifiedCount} transaction logs to status: ${status}`);
    return { modifiedCount: result.modifiedCount };
  }

  async searchTransactions(
    searchTerm: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ transactionLogs: TransactionLog[]; total: number; totalPages: number }> {
    const searchQuery = {
      $and: [
        { deletedAt: null },
        {
          $or: [
            { transactionId: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
            { type: { $regex: searchTerm, $options: 'i' } },
          ],
        },
      ],
    };

    const skip = (page - 1) * limit;

    const [transactionLogs, total] = await Promise.all([
      this.transactionLogModel
        .find(searchQuery)
        .populate('fromUserId', 'firstName lastName email')
        .populate('toUserId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionLogModel.countDocuments(searchQuery),
    ]);

    const totalPages = Math.ceil(total / limit);

    return { transactionLogs, total, totalPages };
  }

  // Export methods for reporting
  async exportTransactionLogs(
    filters: TransactionLogFilters = {},
    format: 'csv' | 'json' = 'csv'
  ): Promise<TransactionLog[]> {
    const query: any = { deletedAt: null };

    // Apply filters (similar to findAll method)
    if (filters.type) query.type = filters.type;
    if (filters.fromUserId) query.fromUserId = filters.fromUserId;
    if (filters.toUserId) query.toUserId = filters.toUserId;
    if (filters.status) query.status = filters.status;
    if (filters.relatedType) query.relatedType = filters.relatedType;
    if (filters.relatedId) query.relatedId = filters.relatedId;

    if (filters.amountRange) {
      query.amount = {
        $gte: filters.amountRange.min,
        $lte: filters.amountRange.max,
      };
    }

    if (filters.dateRange) {
      query.createdAt = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end,
      };
    }

    return this.transactionLogModel
      .find(query)
      .populate('fromUserId', 'firstName lastName email')
      .populate('toUserId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Cleanup methods
  async cleanupOldTransactions(daysOld: number = 365): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.transactionLogModel.updateMany(
      {
        createdAt: { $lte: cutoffDate },
        status: { $in: ['completed', 'failed', 'cancelled'] },
        deletedAt: null,
      },
      {
        deletedAt: new Date(),
      }
    );

    this.logger.log(`Cleaned up ${result.modifiedCount} old transaction logs`);
    return { deletedCount: result.modifiedCount };
  }

  // Private helper methods
  private generateTransactionId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `txn_${timestamp}_${random}`;
  }

  // Validation methods
  async validateTransactionExists(transactionId: string): Promise<boolean> {
    const count = await this.transactionLogModel.countDocuments({
      transactionId,
      deletedAt: null,
    });
    return count > 0;
  }

  async getTransactionBalance(userId: string): Promise<{
    totalIncoming: number;
    totalOutgoing: number;
    balance: number;
    pendingIncoming: number;
    pendingOutgoing: number;
    availableBalance: number;
  }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const userObjectId = new Types.ObjectId(userId);

    const [incomingResult, outgoingResult, pendingIncomingResult, pendingOutgoingResult] = await Promise.all([
      // Completed incoming transactions
      this.transactionLogModel.aggregate([
        {
          $match: {
            toUserId: userObjectId,
            status: 'completed',
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$netAmount' },
          },
        },
      ]),
      // Completed outgoing transactions
      this.transactionLogModel.aggregate([
        {
          $match: {
            fromUserId: userObjectId,
            status: 'completed',
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),
      // Pending incoming transactions
      this.transactionLogModel.aggregate([
        {
          $match: {
            toUserId: userObjectId,
            status: 'pending',
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$netAmount' },
          },
        },
      ]),
      // Pending outgoing transactions (withdrawals, etc.)
      this.transactionLogModel.aggregate([
        {
          $match: {
            fromUserId: userObjectId,
            status: 'pending',
            type: { $in: ['withdrawal', 'payment'] },
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const totalIncoming = incomingResult.length > 0 ? incomingResult[0].total : 0;
    const totalOutgoing = outgoingResult.length > 0 ? outgoingResult[0].total : 0;
    const pendingIncoming = pendingIncomingResult.length > 0 ? pendingIncomingResult[0].total : 0;
    const pendingOutgoing = pendingOutgoingResult.length > 0 ? pendingOutgoingResult[0].total : 0;

    const totalBalance = totalIncoming - totalOutgoing;
    const availableBalance = totalBalance - pendingOutgoing; // Available balance excludes pending outgoing

    return {
      totalIncoming,
      totalOutgoing,
      balance: totalBalance,
      pendingIncoming,
      pendingOutgoing,
      availableBalance,
    };
  }
}