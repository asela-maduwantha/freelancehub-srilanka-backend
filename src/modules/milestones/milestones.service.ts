import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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

@Injectable()
export class MilestoneService {
  constructor(
    @InjectModel(Milestone.name) private milestoneModel: Model<Milestone>,
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
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

    // Update contract milestone count
    await this.contractModel.findByIdAndUpdate(
      createMilestoneDto.contractId,
      { $inc: { milestoneCount: 1 } }
    );

    return savedMilestone;
  }

  async findById(id: string, userId: string): Promise<Milestone> {
    const milestone = await this.milestoneModel
      .findOne({ _id: id, deletedAt: null })
      .populate('contractId', 'clientId freelancerId title')
      .populate('paymentId')
      .exec();

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    // Check if user has access to this milestone
    const contract = milestone.contractId as any;
    if (contract.clientId.toString() !== userId && contract.freelancerId.toString() !== userId) {
      throw new ForbiddenException('Access denied to this milestone');
    }

    return milestone;
  }


  async findAll(filters: MilestoneFilters, userId: string): Promise<{ milestones: Milestone[]; total: number }> {
    const query: any = { deletedAt: null };

    // Build query based on filters
    if (filters.contractId) {
      // Verify user has access to this contract
      const contract = await this.contractModel.findById(filters.contractId);
      if (!contract || (contract.clientId.toString() !== userId && contract.freelancerId.toString() !== userId)) {
        throw new ForbiddenException('Access denied to this contract');
      }
      query.contractId = filters.contractId;
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

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    let aggregationPipeline: any[] = [
      { $match: query },
    ];

    // Handle overdue filter
    if (filters.isOverdue !== undefined) {
      aggregationPipeline.push({
        $addFields: {
          isOverdue: {
            $and: [
              { $ne: ['$dueDate', null] },
              { $gt: [new Date(), '$dueDate'] },
              { $not: { $in: ['$status', [MilestoneStatus.APPROVED, MilestoneStatus.PAID]] } }
            ]
          }
        }
      });
      aggregationPipeline.push({
        $match: { isOverdue: filters.isOverdue }
      });
    }

    // Add sorting, pagination
    aggregationPipeline.push(
      { $sort: { order: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    );

    // Add population
    aggregationPipeline.push(
      {
        $lookup: {
          from: 'contracts',
          localField: 'contractId',
          foreignField: '_id',
          as: 'contract'
        }
      },
      {
        $lookup: {
          from: 'payments',
          localField: 'paymentId',
          foreignField: '_id',
          as: 'payment'
        }
      }
    );

    const milestones = await this.milestoneModel.aggregate(aggregationPipeline);

    // Get total count
    const totalPipeline = [...aggregationPipeline];
    // Remove pagination stages for count
    const paginationStages = ['$skip', '$limit'];
    const countPipeline = totalPipeline.filter(stage =>
      !paginationStages.some(ps => ps in stage)
    );
    countPipeline.push({ $count: 'total' });

    const totalResult = await this.milestoneModel.aggregate(countPipeline);
    const total = totalResult[0]?.total || 0;

    return { milestones, total };
  }

  async update(id: string, updateMilestoneDto: UpdateMilestoneDto, userId: string): Promise<Milestone> {
    const milestone = await this.findById(id, userId);
    const contract = milestone.contractId as any;

    // Only client can update milestones and only if not submitted/approved/paid
    if (contract.clientId.toString() !== userId) {
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
      .findByIdAndUpdate(id, updateMilestoneDto, { new: true, runValidators: true })
      .populate('contractId', 'clientId freelancerId title')
      .populate('paymentId');

    return updatedMilestone!;
  }

  async submit(id: string, submitDto: SubmitMilestoneDto, userId: string): Promise<Milestone> {
    const milestone = await this.findById(id, userId);
    const contract = milestone.contractId as any;

    // Only freelancer can submit milestones
    if (contract.freelancerId.toString() !== userId) {
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
      )
      .populate('contractId', 'clientId freelancerId title')
      .populate('paymentId');

    return updatedMilestone!;
  }

  async approve(id: string, userId: string): Promise<Milestone> {
    const milestone = await this.findById(id, userId);
    const contract = milestone.contractId as any;

    // Only client can approve milestones
    if (contract.clientId.toString() !== userId) {
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
      )
      .populate('contractId', 'clientId freelancerId title')
      .populate('paymentId');

    // Update contract completed milestones count
    await this.contractModel.findByIdAndUpdate(
      milestone.contractId,
      { $inc: { completedMilestones: 1 } }
    );

    return updatedMilestone!;
  }

  async reject(id: string, feedback: string, userId: string): Promise<Milestone> {
    const milestone = await this.findById(id, userId);
    const contract = milestone.contractId as any;

    // Only client can reject milestones
    if (contract.clientId.toString() !== userId) {
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
      )
      .populate('contractId', 'clientId freelancerId title')
      .populate('paymentId');

    return updatedMilestone!;
  }

  async markInProgress(id: string, userId: string): Promise<Milestone> {
    const milestone = await this.findById(id, userId);
    const contract = milestone.contractId as any;

    // Only freelancer can mark milestone as in progress
    if (contract.freelancerId.toString() !== userId) {
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
      )
      .populate('contractId', 'clientId freelancerId title')
      .populate('paymentId');

    return updatedMilestone!;
  }

  async processPayment(id: string, paymentId: string, userId: string): Promise<Milestone> {
    const milestone = await this.findById(id, userId);
    const contract = milestone.contractId as any;

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
      )
      .populate('contractId', 'clientId freelancerId title')
      .populate('paymentId');

    // Update contract total paid amount
    await this.contractModel.findByIdAndUpdate(
      milestone.contractId,
      { $inc: { totalPaid: milestone.amount } }
    );

    return updatedMilestone!;
  }

  async getOverdueMilestones(userId?: string): Promise<Milestone[]> {
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

    return this.milestoneModel
      .find(query)
      .populate('contractId', 'clientId freelancerId title')
      .sort({ dueDate: 1 })
      .exec();
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
    const contract = milestone.contractId as any;

    // Only client can delete milestones and only if not submitted/approved/paid
    if (contract.clientId.toString() !== userId) {
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
  }
}
