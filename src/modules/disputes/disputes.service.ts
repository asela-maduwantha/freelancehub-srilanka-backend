import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Dispute } from '../../database/schemas/dispute.schema';
import { Contract } from '../../database/schemas/contract.schema';
import { User } from '../../database/schemas/user.schema';
import { Milestone } from '../../database/schemas/milestone.schema';
import { DisputeStatus } from '../../common/enums/dispute-status.enum';
import { ContractStatus } from '../../common/enums/contract-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateDisputeDto, ResolveDisputeDto, AddEvidenceDto, UpdateDisputeStatusDto } from './dto';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    @InjectModel(Dispute.name) private disputeModel: Model<Dispute>,
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Milestone.name) private milestoneModel: Model<Milestone>,
  ) {}

  async createDispute(userId: string, createDisputeDto: CreateDisputeDto) {
    const { contractId, milestoneId, type, reason, description, amount, evidenceUrls } = createDisputeDto;

    // Validate contract exists and user is a party
    const contract = await this.contractModel.findById(contractId);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const isClient = contract.clientId.toString() === userId;
    const isFreelancer = contract.freelancerId.toString() === userId;

    if (!isClient && !isFreelancer) {
      throw new ForbiddenException('You are not a party to this contract');
    }

    // Validate milestone if provided
    if (milestoneId) {
      const milestone = await this.milestoneModel.findOne({
        _id: milestoneId,
        contractId,
      });
      if (!milestone) {
        throw new NotFoundException('Milestone not found for this contract');
      }
    }

    // Check if there's already an open dispute for this contract
    const existingDispute = await this.disputeModel.findOne({
      contractId,
      status: { $in: [DisputeStatus.OPEN, 'in_review', 'escalated'] },
    });

    if (existingDispute) {
      throw new BadRequestException('There is already an active dispute for this contract');
    }

    // Determine respondent
    const respondentId = isClient ? contract.freelancerId : contract.clientId;

    // Create evidence array if URLs provided
    const evidence = evidenceUrls?.map((url) => ({
      filename: url.split('/').pop() || 'evidence',
      url,
      size: 0, // Size would be determined from file upload
      type: 'unknown',
      uploadedAt: new Date(),
      uploadedBy: new Types.ObjectId(userId),
    })) || [];

    // Create dispute
    const dispute = await this.disputeModel.create({
      contractId,
      milestoneId: milestoneId ? new Types.ObjectId(milestoneId) : undefined,
      raisedBy: new Types.ObjectId(userId),
      respondent: respondentId,
      type,
      reason,
      description,
      amount,
      evidence,
      status: DisputeStatus.OPEN,
    });

    // Update contract status to disputed
    await this.contractModel.findByIdAndUpdate(contractId, {
      status: ContractStatus.DISPUTED,
      'metadata.disputeId': dispute._id,
      'metadata.disputedAt': new Date(),
    });

    this.logger.log(`Dispute created: ${dispute._id} for contract ${contractId} by user ${userId}`);

    return this.getDisputeById((dispute._id as Types.ObjectId).toString(), userId);
  }

  async getMyDisputes(userId: string, status?: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const query: any = {
      $or: [
        { raisedBy: new Types.ObjectId(userId) },
        { respondent: new Types.ObjectId(userId) },
      ],
    };

    if (status) {
      query.status = status;
    }

    const [disputes, total] = await Promise.all([
      this.disputeModel
        .find(query)
        .populate('contractId', 'title totalAmount')
        .populate('raisedBy', 'email profile')
        .populate('respondent', 'email profile')
        .populate('milestoneId', 'title amount')
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

  async getDisputeById(disputeId: string, userId: string) {
    const dispute = await this.disputeModel
      .findById(disputeId)
      .populate('contractId', 'title totalAmount status')
      .populate('raisedBy', 'email profile role')
      .populate('respondent', 'email profile role')
      .populate('milestoneId', 'title amount status')
      .populate('resolvedBy', 'email profile')
      .lean();

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check if user has access to this dispute
    const isParty =
      dispute.raisedBy._id.toString() === userId ||
      dispute.respondent._id.toString() === userId;

    const user = await this.userModel.findById(userId);
    const isAdmin = user?.role === UserRole.ADMIN;

    if (!isParty && !isAdmin) {
      throw new ForbiddenException('You do not have access to this dispute');
    }

    return dispute;
  }

  async addEvidence(disputeId: string, userId: string, addEvidenceDto: AddEvidenceDto) {
    const dispute = await this.disputeModel.findById(disputeId);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check if user is a party to the dispute
    const isParty =
      dispute.raisedBy.toString() === userId ||
      dispute.respondent.toString() === userId;

    if (!isParty) {
      throw new ForbiddenException('You are not a party to this dispute');
    }

    // Check if dispute is still open for evidence
    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CLOSED) {
      throw new BadRequestException('Cannot add evidence to a closed dispute');
    }

    // Add evidence
    const evidence = {
      filename: addEvidenceDto.filename,
      url: addEvidenceDto.fileUrl,
      size: addEvidenceDto.size,
      type: addEvidenceDto.type,
      uploadedAt: new Date(),
      uploadedBy: new Types.ObjectId(userId),
    };

    await this.disputeModel.findByIdAndUpdate(disputeId, {
      $push: { evidence },
    });

    this.logger.log(`Evidence added to dispute ${disputeId} by user ${userId}`);

    return this.getDisputeById(disputeId, userId);
  }

  async updateDisputeStatus(disputeId: string, userId: string, updateStatusDto: UpdateDisputeStatusDto) {
    const dispute = await this.disputeModel.findById(disputeId);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Only admins or parties can update status
    const user = await this.userModel.findById(userId);
    const isAdmin = user?.role === UserRole.ADMIN;
    const isParty =
      dispute.raisedBy.toString() === userId ||
      dispute.respondent.toString() === userId;

    if (!isAdmin && !isParty) {
      throw new ForbiddenException('You do not have permission to update this dispute');
    }

    // Some status changes are admin-only
    if (['in_review', 'resolved', 'escalated'].includes(updateStatusDto.status) && !isAdmin) {
      throw new ForbiddenException('Only admins can set this status');
    }

    const updateData: any = {
      status: updateStatusDto.status,
    };

    if (updateStatusDto.notes) {
      updateData['metadata.statusChangeNotes'] = updateStatusDto.notes;
      updateData['metadata.statusChangedAt'] = new Date();
      updateData['metadata.statusChangedBy'] = userId;
    }

    await this.disputeModel.findByIdAndUpdate(disputeId, updateData);

    this.logger.log(`Dispute ${disputeId} status updated to ${updateStatusDto.status} by user ${userId}`);

    return this.getDisputeById(disputeId, userId);
  }

  async resolveDispute(disputeId: string, adminId: string, resolveDisputeDto: ResolveDisputeDto) {
    const dispute = await this.disputeModel.findById(disputeId).populate('contractId');
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Verify admin role
    const admin = await this.userModel.findById(adminId);
    if (admin?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can resolve disputes');
    }

    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CLOSED) {
      throw new BadRequestException('Dispute is already resolved or closed');
    }

    const { resolution, resolutionDetails, refundAmount, favoredUserId } = resolveDisputeDto;

    // Update dispute
    const updateData: any = {
      status: DisputeStatus.RESOLVED,
      resolution,
      resolutionDetails,
      resolvedBy: new Types.ObjectId(adminId),
      resolvedAt: new Date(),
    };

    if (refundAmount !== undefined) {
      updateData.amount = refundAmount;
    }

    await this.disputeModel.findByIdAndUpdate(disputeId, updateData);

    // Update contract status back to active if not cancelled
    const contract = dispute.contractId as any;
    if (contract.status === ContractStatus.DISPUTED) {
      await this.contractModel.findByIdAndUpdate(contract._id, {
        status: ContractStatus.ACTIVE,
        $unset: { 'metadata.disputeId': '' },
      });
    }

    // Handle refunds or payments based on resolution
    // This would integrate with payment service for actual money movement
    // For now, just log the action
    this.logger.log(
      `Dispute ${disputeId} resolved by admin ${adminId}. Resolution: ${resolution}`,
    );

    if (refundAmount && favoredUserId) {
      this.logger.log(
        `Refund of ${refundAmount} to be processed for user ${favoredUserId}`,
      );
      // TODO: Integrate with payment service to process refund
    }

    return this.getDisputeById(disputeId, adminId);
  }

  async closeDispute(disputeId: string, userId: string, reason?: string) {
    const dispute = await this.disputeModel.findById(disputeId);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check permissions
    const user = await this.userModel.findById(userId);
    const isAdmin = user?.role === UserRole.ADMIN;
    const isRaiser = dispute.raisedBy.toString() === userId;

    // Only admin or dispute raiser can close
    if (!isAdmin && !isRaiser) {
      throw new ForbiddenException('You do not have permission to close this dispute');
    }

    // Can only close if open or if you're admin
    if (dispute.status !== DisputeStatus.OPEN && !isAdmin) {
      throw new BadRequestException('Can only close open disputes');
    }

    await this.disputeModel.findByIdAndUpdate(disputeId, {
      status: DisputeStatus.CLOSED,
      closedAt: new Date(),
      'metadata.closedReason': reason,
      'metadata.closedBy': userId,
    });

    // Update contract status back to active
    await this.contractModel.findByIdAndUpdate(dispute.contractId, {
      status: ContractStatus.ACTIVE,
      $unset: { 'metadata.disputeId': '' },
    });

    this.logger.log(`Dispute ${disputeId} closed by user ${userId}`);

    return { message: 'Dispute closed successfully' };
  }

  async escalateDispute(disputeId: string, userId: string, notes?: string) {
    const dispute = await this.disputeModel.findById(disputeId);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check if user is a party to the dispute
    const isParty =
      dispute.raisedBy.toString() === userId ||
      dispute.respondent.toString() === userId;

    if (!isParty) {
      throw new ForbiddenException('You are not a party to this dispute');
    }

    if (dispute.status !== DisputeStatus.OPEN) {
      throw new BadRequestException('Can only escalate open disputes');
    }

    await this.disputeModel.findByIdAndUpdate(disputeId, {
      status: 'escalated',
      'metadata.escalatedAt': new Date(),
      'metadata.escalatedBy': userId,
      'metadata.escalationNotes': notes,
    });

    this.logger.log(`Dispute ${disputeId} escalated by user ${userId}`);

    return this.getDisputeById(disputeId, userId);
  }

  async getDisputeStatistics(userId?: string) {
    const query = userId
      ? {
          $or: [
            { raisedBy: new Types.ObjectId(userId) },
            { respondent: new Types.ObjectId(userId) },
          ],
        }
      : {};

    const [byStatus, byType, recentDisputes] = await Promise.all([
      this.disputeModel.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.disputeModel.aggregate([
        { $match: query },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.disputeModel.countDocuments({
        ...query,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    return {
      byStatus,
      byType,
      recentDisputes,
    };
  }
}
