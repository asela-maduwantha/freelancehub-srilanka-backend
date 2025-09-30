import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Milestone, Contract, Payment } from 'src/database/schemas';
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

@Injectable()
export class MilestoneService {
  constructor(
    @InjectModel(Milestone.name) private milestoneModel: Model<Milestone>,
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private notificationsService: NotificationsService,
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
      throw new BadRequestException('Only pending or rejected milestones can be marked as in progress');
    }

    const updatedMilestone = await this.milestoneModel
      .findByIdAndUpdate(
        id,
        { status: MilestoneStatus.IN_PROGRESS },
        { new: true, runValidators: true }
      );

    // Invalidate cache for this milestone and contract
    await this.invalidateMilestoneCache(id);
    await this.invalidateContractMilestoneCache(milestone.contractId._id.toString());

    return updatedMilestone!.toJSON();
  }

  async processPayment(id: string, paymentId: string, userId: string): Promise<Milestone> {
    const milestone = await this.findById(id, userId);
    const contract = await this.contractModel.findById(milestone.contractId);

    // Verify the payment exists and is completed
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment must be completed to update milestone');
    }

    // Only approved milestones can be marked as paid
    if (milestone.status !== MilestoneStatus.APPROVED) {
      throw new BadRequestException('Only approved milestones can be marked as paid');
    }

    const updatedMilestone = await this.milestoneModel
      .findByIdAndUpdate(
        id,
        {
          status: MilestoneStatus.PAID,
          paymentId: new Types.ObjectId(paymentId),
          paidAt: new Date(),
        },
        { new: true, runValidators: true }
      );

    // Update contract total paid amount
    await this.contractModel.findByIdAndUpdate(
      milestone.contractId,
      { $inc: { totalPaid: milestone.amount } }
    );

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

    // Note: For findAll cache keys with filters, we can't predict all combinations,
    // so they will expire naturally based on TTL
  }
}
