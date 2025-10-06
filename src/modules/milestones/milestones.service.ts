import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Milestone, Contract } from 'src/database/schemas';
import { MilestoneStatus, ContractStatus, PaymentStatus } from 'src/common/enums';
import {
  CreateMilestoneDto,
  UpdateMilestoneDto,
  SubmitMilestoneDto,
  MilestoneFilters
} from './dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { NotificationsService } from '../notifications/notifications.service';
import { TransactionLogService } from '../payments/transaction-log.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MilestoneService {
  private readonly logger = new Logger(MilestoneService.name);

  constructor(
    @InjectModel(Milestone.name) private milestoneModel: Model<Milestone>,
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private notificationsService: NotificationsService,
    private transactionLogService: TransactionLogService,
  ) {}

  async create(createMilestoneDto: CreateMilestoneDto, userId: string): Promise<Milestone> {
    const contract = await this.contractModel.findById(createMilestoneDto.contractId);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Check if user is the client of the contract
    if (contract.clientId.toString() !== userId) {
      throw new ForbiddenException('Only the client can create milestones');
    }

    // Check if contract is active
    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException('Can only create milestones for active contracts');
    }

    // Check if order is unique within the contract
    const existingMilestone = await this.milestoneModel.findOne({
      contractId: createMilestoneDto.contractId,
      order: createMilestoneDto.order,
      deletedAt: null,
    });

    if (existingMilestone) {
      throw new BadRequestException('Milestone order must be unique within the contract');
    }

    const milestone = new this.milestoneModel({
      ...createMilestoneDto,
      contractId: new Types.ObjectId(createMilestoneDto.contractId),
      currency: createMilestoneDto.currency || contract.currency,
    });

    const savedMilestone = await milestone.save();

    // Send notification to freelancer about milestone creation
    try {
      await this.notificationsService.notifyMilestoneCreated(
        (savedMilestone._id as Types.ObjectId).toString(),
        savedMilestone.title,
        contract.freelancerId.toString()
      );
    } catch (notificationError) {
      console.error('Failed to send milestone created notification:', notificationError);
      // Don't fail milestone creation if notification fails
    }

    // Update contract milestone count
    await this.contractModel.findByIdAndUpdate(
      createMilestoneDto.contractId,
      { $inc: { milestoneCount: 1 } }
    );

    // Invalidate cache for this contract's milestones
    await this.invalidateContractMilestoneCache(createMilestoneDto.contractId);

    // Return plain object to avoid serialization issues
    return savedMilestone.toJSON();
  }

  async findById(id: string, userId: string): Promise<Milestone> {
    // Create cache key
    const cacheKey = `milestone:${id}_user:${userId}`;

    // Try to get from cache first
    const cachedMilestone = await this.cacheManager.get<Milestone>(cacheKey);
    if (cachedMilestone) {
      return cachedMilestone;
    }

    const milestone = await this.milestoneModel
      .findOne({ _id: id, deletedAt: null })
      .populate('contractId', 'title description contractType totalAmount currency clientId freelancerId')
      .populate('paymentId', 'amount currency status processedAt')
      .exec();

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    // Check if user has access to this milestone
    const contract = await this.contractModel.findById(milestone.contractId);
    if (!contract || (contract.clientId.toString() !== userId && contract.freelancerId.toString() !== userId)) {
      throw new ForbiddenException('Access denied to this milestone');
    }

    const result = milestone.toObject();

    // Cache for 10 minutes (milestones change frequently)
    await this.cacheManager.set(cacheKey, result, 600000);

    return result;
  }

  async findAll(filters: MilestoneFilters, userId: string): Promise<{ milestones: Milestone[]; total: number }> {
    // Create cache key from search parameters
    const cacheKey = `milestones_user:${userId}:${JSON.stringify(filters)}`;

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<{ milestones: Milestone[]; total: number }>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const query: any = { deletedAt: null };

    // Build query based on filters
    if (filters.contractId) {
      // Verify user has access to this contract
      const contract = await this.contractModel.findById(filters.contractId);
      if (!contract || (contract.clientId.toString() !== userId && contract.freelancerId.toString() !== userId)) {
        throw new ForbiddenException('Access denied to this contract');
      }
      query.contractId = new Types.ObjectId(filters.contractId);
    } else {
      // If no contract specified, get milestones for user's contracts
      const userContracts = await this.contractModel.find({
        $or: [{ clientId: userId }, { freelancerId: userId }],
        deletedAt: null,
      }).select('_id');

      query.contractId = { $in: userContracts.map(c => c._id) };
    }

    if (filters.status) {
      query.status = filters.status;
    }

    // Add search functionality
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    // Handle overdue filter
    if (filters.isOverdue !== undefined) {
      if (filters.isOverdue) {
        query.dueDate = { $lt: new Date() };
        query.status = { $nin: [MilestoneStatus.APPROVED, MilestoneStatus.PAID] };
      }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Use populate instead of complex aggregation
    const [milestones, total] = await Promise.all([
      this.milestoneModel
        .find(query)
        .populate('contractId', 'title description contractType totalAmount currency clientId freelancerId')
        .populate('paymentId', 'amount currency status processedAt')
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.milestoneModel.countDocuments(query),
    ]);

    const result = {
      milestones: milestones.map(milestone => milestone.toObject()),
      total
    };

    // Cache for 5 minutes (milestones change moderately frequently)
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  async update(id: string, updateMilestoneDto: UpdateMilestoneDto, userId: string): Promise<Milestone> {
    const milestone = await this.findById(id, userId);
    const contract = await this.contractModel.findById(milestone.contractId);

    // Only client can update milestones and only if not submitted/approved/paid
    if (contract!.clientId.toString() !== userId) {
      throw new ForbiddenException('Only the client can update milestones');
    }

    if ([MilestoneStatus.SUBMITTED, MilestoneStatus.APPROVED, MilestoneStatus.PAID].includes(milestone.status)) {
      throw new BadRequestException('Cannot update milestone that has been submitted, approved, or paid');
    }

    // Check if order is being changed and if it's unique
    if (updateMilestoneDto.order && updateMilestoneDto.order !== milestone.order) {
      const existingMilestone = await this.milestoneModel.findOne({
        contractId: milestone.contractId,
        order: updateMilestoneDto.order,
        _id: { $ne: id },
        deletedAt: null,
      });

      if (existingMilestone) {
        throw new BadRequestException('Milestone order must be unique within the contract');
      }
    }

    const updatedMilestone = await this.milestoneModel
      .findByIdAndUpdate(id, updateMilestoneDto, { new: true, runValidators: true });

    // Invalidate cache for this milestone and contract
    await this.invalidateMilestoneCache(id);
    await this.invalidateContractMilestoneCache(milestone.contractId._id.toString());

    return updatedMilestone!.toJSON();
  }

  async submit(id: string, submitDto: SubmitMilestoneDto, userId: string): Promise<Milestone> {
    const milestone = await this.findById(id, userId);
    const contract = await this.contractModel.findById(milestone.contractId);

    // Only freelancer can submit milestones
    if (contract!.freelancerId.toString() !== userId) {
      throw new ForbiddenException('Only the freelancer can submit milestones');
    }

    // Check if milestone can be submitted
    if (milestone.status !== MilestoneStatus.IN_PROGRESS && milestone.status !== MilestoneStatus.PENDING) {
      throw new BadRequestException('Milestone must be in progress or pending to be submitted');
    }

    // Validate deliverables
    if (!submitDto.deliverables || submitDto.deliverables.length === 0) {
      throw new BadRequestException('At least one deliverable is required');
    }

    const updatedMilestone = await this.milestoneModel
      .findByIdAndUpdate(
        id,
        {
          status: MilestoneStatus.SUBMITTED,
          deliverables: submitDto.deliverables,
          submissionNote: submitDto.submissionNote,
          submittedAt: new Date(),
        },
        { new: true, runValidators: true }
      );

    // Send notification to client about milestone submission
    try {
      await this.notificationsService.notifyMilestoneSubmitted(
        (updatedMilestone!._id as Types.ObjectId).toString(),
        updatedMilestone!.title,
        contract!.clientId.toString()
      );
    } catch (notificationError) {
      console.error('Failed to send milestone submitted notification:', notificationError);
      // Don't fail milestone submission if notification fails
    }

    // Invalidate cache for this milestone and contract
    await this.invalidateMilestoneCache(id);
    await this.invalidateContractMilestoneCache(milestone.contractId._id.toString());

    return updatedMilestone!.toJSON();
  }

  async approve(id: string, userId: string): Promise<Milestone> {
    const milestone = await this.findById(id, userId);
    const contract = await this.contractModel.findById(milestone.contractId);

    // Only client can approve milestones
    if (contract!.clientId.toString() !== userId) {
      throw new ForbiddenException('Only the client can approve milestones');
    }

    // Check if milestone can be approved
    if (milestone.status !== MilestoneStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted milestones can be approved');
    }

    const updatedMilestone = await this.milestoneModel
      .findByIdAndUpdate(
        id,
        {
          status: MilestoneStatus.APPROVED,
          approvedAt: new Date(),
        },
        { new: true, runValidators: true }
      );

    // Send notification to freelancer about milestone approval
    try {
      await this.notificationsService.notifyMilestoneCompleted(
        (updatedMilestone!._id as Types.ObjectId).toString(),
        updatedMilestone!.title,
        contract!.freelancerId.toString()
      );
    } catch (notificationError) {
      console.error('Failed to send milestone approved notification:', notificationError);
      // Don't fail milestone approval if notification fails
    }

    // Update contract completed milestones count
    await this.contractModel.findByIdAndUpdate(
      milestone.contractId,
      { $inc: { completedMilestones: 1 } }
    );

    // Invalidate cache for this milestone and contract
    await this.invalidateMilestoneCache(id);
    await this.invalidateContractMilestoneCache(milestone.contractId._id.toString());

    // Check if contract has been paid upfront
    if (contract!.totalPaid === 0) {
      throw new BadRequestException('Contract payment has not been completed yet');
    }

    // Check if there's enough remaining balance to release this milestone
    const remainingBalance = contract!.totalAmount - contract!.releasedAmount;
    if (remainingBalance < milestone.amount) {
      throw new BadRequestException('Insufficient contract balance to release this milestone amount');
    }

    // CRITICAL FIX: Validate freelancer has sufficient pending balance BEFORE transferring
    const freelancer = await this.contractModel.db.model('User').findById(contract!.freelancerId);
    if (!freelancer) {
      throw new NotFoundException('Freelancer not found');
    }

    const currentPendingBalance = freelancer.freelancerData?.pendingBalance || 0;
    if (currentPendingBalance < milestone.amount) {
      this.logger.error(
        `CRITICAL: Freelancer ${contract!.freelancerId} has insufficient pending balance (${currentPendingBalance}) for milestone release (${milestone.amount}). Manual reconciliation required!`
      );
      throw new BadRequestException(
        `Insufficient pending balance to release milestone. Expected: $${milestone.amount}, Available: $${currentPendingBalance}. Please contact support.`
      );
    }

    // Update contract released amount
    await this.contractModel.findByIdAndUpdate(
      milestone.contractId,
      { $inc: { releasedAmount: milestone.amount } }
    );

    // Update freelancer's available balance ATOMICALLY
    // The milestone amount is released from pending to available
    try {
      const updatedUser = await this.contractModel.db.model('User').findOneAndUpdate(
        {
          _id: contract!.freelancerId,
          'freelancerData.pendingBalance': { $gte: milestone.amount }, // Atomic validation
        },
        { 
          $inc: { 
            'freelancerData.availableBalance': milestone.amount,
            'freelancerData.pendingBalance': -milestone.amount
          } 
        },
        { new: true }
      );

      if (!updatedUser) {
        throw new Error('Failed to update freelancer balance - insufficient pending balance or user not found');
      }

      this.logger.log(
        `Updated freelancer ${contract!.freelancerId} balance: +$${milestone.amount} available, -$${milestone.amount} pending. New balances - Available: $${updatedUser.freelancerData?.availableBalance}, Pending: $${updatedUser.freelancerData?.pendingBalance}`
      );
    } catch (balanceError) {
      this.logger.error(
        `CRITICAL: Failed to update freelancer balance for milestone ${milestone._id}: ${balanceError.message}. Manual reconciliation required!`,
        balanceError.stack
      );
      throw new BadRequestException(
        'Failed to release milestone funds. Please contact support for manual processing.'
      );
    }

    // Create transaction log for the release
    // NOTE: Platform fee was already deducted during upfront payment
    // This is just releasing the already-paid milestone amount
    try {
      await this.transactionLogService.create({
        transactionId: uuidv4(),
        type: 'payment', // Use payment type for milestone releases
        fromUserId: contract!.clientId, // From client
        toUserId: contract!.freelancerId, // To freelancer
        amount: milestone.amount,
        currency: milestone.currency,
        fee: 0, // Fee already deducted during upfront payment
        netAmount: milestone.amount, // Full amount goes to freelancer
        relatedId: milestone._id as Types.ObjectId,
        relatedType: 'milestone',
        description: `Milestone payment released: ${milestone.title}`,
        metadata: {
          contractId: (contract!._id as Types.ObjectId).toString(),
          milestoneId: (milestone._id as Types.ObjectId).toString(),
          freelancerId: contract!.freelancerId.toString(),
          clientId: contract!.clientId.toString(),
        },
      });
    } catch (logError) {
      console.error('Failed to create transaction log:', logError);
      // Don't fail milestone approval if logging fails
    }

    // Send notification about payment release
    try {
      await this.notificationsService.notifyPaymentSent(
        (milestone._id as Types.ObjectId).toString(), // Use milestone ID as payment reference
        milestone.amount,
        contract!.freelancerId.toString()
      );
    } catch (notificationError) {
      console.error('Failed to send payment release notification:', notificationError);
      // Don't fail milestone approval if notification fails
    }

    // Invalidate cache and return updated milestone
    await this.invalidateMilestoneCache(id);
    await this.invalidateContractMilestoneCache(milestone.contractId._id.toString());

    return updatedMilestone!.toJSON();
  }

  async reject(id: string, feedback: string, userId: string): Promise<Milestone> {
    const milestone = await this.findById(id, userId);
    const contract = await this.contractModel.findById(milestone.contractId);

    // Only client can reject milestones
    if (contract!.clientId.toString() !== userId) {
      throw new ForbiddenException('Only the client can reject milestones');
    }

    // Check if milestone can be rejected
    if (milestone.status !== MilestoneStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted milestones can be rejected');
    }

    if (!feedback || feedback.trim().length === 0) {
      throw new BadRequestException('Feedback is required when rejecting a milestone');
    }

    const updatedMilestone = await this.milestoneModel
      .findByIdAndUpdate(
        id,
        {
          status: MilestoneStatus.REJECTED,
          clientFeedback: feedback,
          rejectedAt: new Date(),
        },
        { new: true, runValidators: true }
      );

    // Invalidate cache for this milestone and contract
    await this.invalidateMilestoneCache(id);
    await this.invalidateContractMilestoneCache(milestone.contractId._id.toString());

    return updatedMilestone!.toJSON();
  }

  async markInProgress(id: string, userId: string): Promise<Milestone> {
    const milestone = await this.findById(id, userId);
    const contract = await this.contractModel.findById(milestone.contractId);

    // Only freelancer can mark milestone as in progress
    if (contract!.freelancerId.toString() !== userId) {
      throw new ForbiddenException('Only the freelancer can mark milestones as in progress');
    }

    // Check if milestone can be marked as in progress
    if (milestone.status !== MilestoneStatus.PENDING && milestone.status !== MilestoneStatus.REJECTED) {
      console.log(`Milestone ${id} status is ${milestone.status}, cannot mark as in progress`);
      throw new BadRequestException(`Only pending or rejected milestones can be marked as in progress. Current status: ${milestone.status}`);
    }

    console.log(`Marking milestone ${id} as in progress for user ${userId}`);

    const updatedMilestone = await this.milestoneModel
      .findByIdAndUpdate(
        id,
        { status: MilestoneStatus.IN_PROGRESS },
        { new: true, runValidators: true }
      );

    console.log(`Milestone ${id} successfully updated to status: ${updatedMilestone!.status}`);

    // Invalidate cache for this milestone and contract
    await this.invalidateMilestoneCache(id);
    await this.invalidateContractMilestoneCache(milestone.contractId._id.toString());

    return updatedMilestone!.toJSON();
  }

  async getOverdueMilestones(userId?: string): Promise<Milestone[]> {
    // Create cache key
    const cacheKey = `overdue_milestones${userId ? `_user:${userId}` : '_all'}`;

    // Try to get from cache first
    const cachedMilestones = await this.cacheManager.get<Milestone[]>(cacheKey);
    if (cachedMilestones) {
      return cachedMilestones;
    }

    const query: any = {
      deletedAt: null,
      dueDate: { $lt: new Date() },
      status: { $nin: [MilestoneStatus.APPROVED, MilestoneStatus.PAID] },
    };

    if (userId) {
      // Get user's contracts
      const userContracts = await this.contractModel.find({
        $or: [{ clientId: userId }, { freelancerId: userId }],
        deletedAt: null,
      }).select('_id');

      query.contractId = { $in: userContracts.map(c => c._id) };
    }

    const milestones = await this.milestoneModel
      .find(query)
      .populate('contractId', 'title description contractType totalAmount currency clientId freelancerId')
      .populate('paymentId', 'amount currency status processedAt')
      .sort({ dueDate: 1 })
      .exec();

    const result = milestones.map(milestone => milestone.toObject());

    // Cache for 5 minutes (overdue milestones change moderately frequently)
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  async getContractMilestoneStats(contractId: string, userId: string): Promise<any> {
    // Verify access to contract
    const contract = await this.contractModel.findById(contractId);
    if (!contract || (contract.clientId.toString() !== userId && contract.freelancerId.toString() !== userId)) {
      throw new ForbiddenException('Access denied to this contract');
    }

    const stats = await this.milestoneModel.aggregate([
      { $match: { contractId: new Types.ObjectId(contractId), deletedAt: null } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          pending: { $sum: { $cond: [{ $eq: ['$status', MilestoneStatus.PENDING] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', MilestoneStatus.IN_PROGRESS] }, 1, 0] } },
          submitted: { $sum: { $cond: [{ $eq: ['$status', MilestoneStatus.SUBMITTED] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', MilestoneStatus.APPROVED] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', MilestoneStatus.REJECTED] }, 1, 0] } },
          paid: { $sum: { $cond: [{ $eq: ['$status', MilestoneStatus.PAID] }, 1, 0] } },
          paidAmount: {
            $sum: {
              $cond: [
                { $eq: ['$status', MilestoneStatus.PAID] },
                '$amount',
                0
              ]
            }
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$dueDate', null] },
                    { $gt: [new Date(), '$dueDate'] },
                    { $not: { $in: ['$status', [MilestoneStatus.APPROVED, MilestoneStatus.PAID]] } }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      totalAmount: 0,
      pending: 0,
      inProgress: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      paid: 0,
      paidAmount: 0,
      overdue: 0
    };
  }

  async delete(id: string, userId: string): Promise<void> {
    const milestone = await this.findById(id, userId);
    const contract = await this.contractModel.findById(milestone.contractId);

    // Only client can delete milestones and only if not submitted/approved/paid
    if (contract!.clientId.toString() !== userId) {
      throw new ForbiddenException('Only the client can delete milestones');
    }

    if ([MilestoneStatus.SUBMITTED, MilestoneStatus.APPROVED, MilestoneStatus.PAID].includes(milestone.status)) {
      throw new BadRequestException('Cannot delete milestone that has been submitted, approved, or paid');
    }

    await this.milestoneModel.findByIdAndUpdate(id, { deletedAt: new Date() });

    // Update contract milestone count
    await this.contractModel.findByIdAndUpdate(
      milestone.contractId,
      { $inc: { milestoneCount: -1 } }
    );

    // Invalidate cache for this milestone and contract
    await this.invalidateMilestoneCache(id);
    await this.invalidateContractMilestoneCache(milestone.contractId._id.toString());
  }

  async reorderMilestones(contractId: string, milestoneOrders: { id: string; order: number }[], userId: string): Promise<void> {
    // Verify access to contract
    const contract = await this.contractModel.findById(contractId);
    if (!contract || contract.clientId.toString() !== userId) {
      throw new ForbiddenException('Only the client can reorder milestones');
    }

    // Validate all milestones belong to the contract
    const milestoneIds = milestoneOrders.map(mo => mo.id);
    const milestones = await this.milestoneModel.find({
      _id: { $in: milestoneIds },
      contractId,
      deletedAt: null,
    });

    if (milestones.length !== milestoneOrders.length) {
      throw new BadRequestException('Some milestones do not belong to this contract');
    }

    // Check if any milestone is in a state that prevents reordering
    const nonReorderableStates = [MilestoneStatus.SUBMITTED, MilestoneStatus.APPROVED, MilestoneStatus.PAID];
    const nonReorderableMilestones = milestones.filter(m => nonReorderableStates.includes(m.status));

    if (nonReorderableMilestones.length > 0) {
      throw new BadRequestException('Cannot reorder milestones that have been submitted, approved, or paid');
    }

    // Update orders
    const bulkOps = milestoneOrders.map(mo => ({
      updateOne: {
        filter: { _id: mo.id },
        update: { order: mo.order }
      }
    }));

    await this.milestoneModel.bulkWrite(bulkOps);

    // Invalidate cache for this contract's milestones
    await this.invalidateContractMilestoneCache(contractId);
  }

  // Cache invalidation helper method
  private async invalidateMilestoneCache(milestoneId: string): Promise<void> {
    // Get the milestone to find associated users
    const milestone = await this.milestoneModel.findById(milestoneId).select('contractId');
    if (!milestone) return;

    // Get contract to find users
    const contract = await this.contractModel.findById(milestone.contractId).select('clientId freelancerId');
    if (!contract) return;

    const userIds = [contract.clientId.toString(), contract.freelancerId.toString()];

    // Invalidate individual milestone cache keys
    const milestoneCacheKeys = userIds.map(userId => `milestone:${milestoneId}_user:${userId}`);

    await Promise.all(
      milestoneCacheKeys.map(key => this.cacheManager.del(key).catch(() => {}))
    );
  }

  private async invalidateContractMilestoneCache(contractId: string): Promise<void> {
    // Get all users who have access to this contract (client and freelancer)
    const contract = await this.contractModel.findById(contractId).select('clientId freelancerId');
    if (!contract) return;

    const userIds = [contract.clientId.toString(), contract.freelancerId.toString()];

    // Invalidate all milestone-related cache keys for these users
    const cacheKeysToDelete = [
      // Individual milestone cache keys (we can't predict all, so we'll use a pattern)
      // Overdue milestones cache
      `overdue_milestones_user:${contract.clientId}`,
      `overdue_milestones_user:${contract.freelancerId}`,
      `overdue_milestones_all`,
      // Contract milestone stats
      `milestone_stats_contract:${contractId}_user:${contract.clientId}`,
      `milestone_stats_contract:${contractId}_user:${contract.freelancerId}`,
    ];

    // Delete known cache keys
    await Promise.all(
      cacheKeysToDelete.map(key => this.cacheManager.del(key).catch(() => {})) // Ignore errors for non-existent keys
    );

    // Clear milestone list caches for both users with common filter combinations
    for (const userId of userIds) {
      for (let page = 1; page <= 5; page++) {
        for (const limit of [10, 20, 50]) {
          // Clear various filter combinations
          const filterCombinations = [
            { contractId },
            { contractId, status: MilestoneStatus.PENDING },
            { contractId, status: MilestoneStatus.IN_PROGRESS },
            { contractId, status: MilestoneStatus.SUBMITTED },
            { contractId, status: MilestoneStatus.APPROVED },
            { contractId, status: MilestoneStatus.PAID },
            {},  // No contractId filter (user's all milestones)
          ];

          for (const filters of filterCombinations) {
            const cacheKey = `milestones_user:${userId}:${JSON.stringify({ ...filters, page, limit })}`;
            await this.cacheManager.del(cacheKey).catch(() => {});
          }
        }
      }
    }
  }
}
