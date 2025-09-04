import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Dispute, DisputeDocument } from '../../../schemas/dispute.schema';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { SubmitEvidenceDto } from '../dto/submit-evidence.dto';
import { AddMessageDto } from '../dto/add-message.dto';
import { UpdateDisputeStatusDto } from '../dto/update-dispute-status.dto';
import { ResolveDisputeDto } from '../dto/resolve-dispute.dto';
import { User, UserDocument } from '../../../schemas/user.schema';
import { Contract, ContractDocument } from '../../../schemas/contract.schema';

@Injectable()
export class DisputesService {
  constructor(
    @InjectModel(Dispute.name) private disputeModel: Model<DisputeDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
  ) {}

  async createDispute(userId: string, createDisputeDto: CreateDisputeDto): Promise<Dispute> {
    const { contractId, ...disputeData } = createDisputeDto;

    // Validate contract exists and user is involved
    const contract = await this.contractModel.findById(contractId);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.clientId.toString() !== userId && contract.freelancerId.toString() !== userId) {
      throw new ForbiddenException('You can only create disputes for contracts you are involved in');
    }

    // Check if contract is active or completed (disputes can be created for these states)
    if (!['active', 'completed'].includes(contract.status)) {
      throw new BadRequestException('Cannot create dispute for this contract status');
    }

    // Check if dispute already exists for this contract
    const existingDispute = await this.disputeModel.findOne({
      contractId,
      status: { $in: ['open', 'under-review'] }
    });

    if (existingDispute) {
      throw new BadRequestException('A dispute already exists for this contract');
    }

    // Determine respondent (the other party)
    const respondentId = contract.clientId.toString() === userId
      ? contract.freelancerId
      : contract.clientId;

    const dispute = new this.disputeModel({
      ...disputeData,
      contractId,
      initiatorId: userId,
      respondentId,
      evidence: disputeData.evidence?.map(evidence => ({
        ...evidence,
        uploadedBy: userId,
      })) || []
    });

    const savedDispute = await dispute.save();

    // Update contract status to disputed
    await this.contractModel.findByIdAndUpdate(contractId, {
      status: 'disputed'
    });

    return savedDispute.populate(['contractId', 'initiatorId', 'respondentId']);
  }

  async getUserDisputes(userId: string): Promise<Dispute[]> {
    return this.disputeModel
      .find({
        $or: [{ initiatorId: userId }, { respondentId: userId }]
      })
      .populate('contractId', 'title status terms.budget')
      .populate('initiatorId', 'firstName lastName email')
      .populate('respondentId', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }

  async getDisputeById(disputeId: string, userId: string): Promise<Dispute> {
    const dispute = await this.disputeModel
      .findById(disputeId)
      .populate('contractId')
      .populate('initiatorId', 'firstName lastName email profilePicture')
      .populate('respondentId', 'firstName lastName email profilePicture')
      .populate('evidence.uploadedBy', 'firstName lastName')
      .populate('messages.senderId', 'firstName lastName')
      .populate('resolution.decidedBy', 'firstName lastName');

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check if user has permission to view this dispute
    if (dispute.initiatorId._id.toString() !== userId && dispute.respondentId._id.toString() !== userId) {
      // Check if user is admin (for now, we'll assume non-admin users can't view other disputes)
      throw new ForbiddenException('You do not have permission to view this dispute');
    }

    return dispute;
  }

  async submitEvidence(
    disputeId: string,
    userId: string,
    submitEvidenceDto: SubmitEvidenceDto,
  ): Promise<Dispute> {
    const dispute = await this.disputeModel.findById(disputeId);

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check if user is involved in the dispute
    if (dispute.initiatorId.toString() !== userId && dispute.respondentId.toString() !== userId) {
      throw new ForbiddenException('You are not involved in this dispute');
    }

    if (dispute.status !== 'open') {
      throw new BadRequestException('Cannot submit evidence for a dispute that is not open');
    }

    // Add evidence
    dispute.evidence.push({
      filename: submitEvidenceDto.files?.[0] || 'evidence.txt',
      url: submitEvidenceDto.files?.[0] || '',
      uploadedBy: new Types.ObjectId(userId),
      description: submitEvidenceDto.description,
      files: submitEvidenceDto.files || [],
      uploadedAt: new Date(),
    });

    return dispute.save();
  }

  async addMessage(
    disputeId: string,
    userId: string,
    addMessageDto: AddMessageDto,
  ): Promise<Dispute> {
    const dispute = await this.disputeModel.findById(disputeId);

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check if user is involved in the dispute
    if (dispute.initiatorId.toString() !== userId && dispute.respondentId.toString() !== userId) {
      throw new ForbiddenException('You are not involved in this dispute');
    }

    if (dispute.status === 'closed') {
      throw new BadRequestException('Cannot add messages to a closed dispute');
    }

    // Add message
    dispute.messages.push({
      senderId: new Types.ObjectId(userId),
      content: addMessageDto.message,
      message: addMessageDto.message,
      timestamp: new Date(),
    });

    return dispute.save();
  }

  async updateDisputeStatus(
    disputeId: string,
    userId: string,
    updateDisputeStatusDto: UpdateDisputeStatusDto,
  ): Promise<Dispute> {
    const dispute = await this.disputeModel.findById(disputeId);

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // For now, only allow status updates by admin users
    // In a real application, you'd check for admin role
    const user = await this.userModel.findById(userId);
    if (!user || !user.role.includes('admin')) {
      throw new ForbiddenException('Only administrators can update dispute status');
    }

    dispute.status = updateDisputeStatusDto.status;
    return dispute.save();
  }

  async resolveDispute(
    disputeId: string,
    userId: string,
    resolveDisputeDto: ResolveDisputeDto,
  ): Promise<Dispute> {
    const dispute = await this.disputeModel.findById(disputeId);

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // For now, only allow resolution by admin users
    const user = await this.userModel.findById(userId);
    if (!user || !user.role.includes('admin')) {
      throw new ForbiddenException('Only administrators can resolve disputes');
    }

    if (dispute.status !== 'under-review') {
      throw new BadRequestException('Dispute must be under review to be resolved');
    }

    dispute.status = 'resolved';
    dispute.resolution = {
      decision: resolveDisputeDto.decision,
      explanation: 'Dispute resolved',
      resolvedBy: new Types.ObjectId(userId),
      decidedBy: new Types.ObjectId(userId),
      refundAmount: resolveDisputeDto.refundAmount || 0,
      resolvedAt: new Date(),
    };

    return dispute.save();
  }

  async getOpenDisputes(): Promise<Dispute[]> {
    return this.disputeModel
      .find({ status: { $in: ['open', 'under-review'] } })
      .populate('contractId', 'title status terms.budget')
      .populate('initiatorId', 'firstName lastName email')
      .populate('respondentId', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }
}
