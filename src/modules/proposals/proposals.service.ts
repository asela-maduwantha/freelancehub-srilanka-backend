// src/modules/proposals/proposals.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Proposal } from '../../database/schemas/proposal.schema';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import {
  ProposalResponseDto,
  ProposalsListResponseDto,
  MessageResponseDto,
} from './dto/proposal-response.dto';
import { ProposalStatus } from '../../common/enums/proposal-status.enum';
import { RESPONSE_MESSAGES } from '../../common/constants/response-messages';

@Injectable()
export class ProposalsService {
  constructor(
    @InjectModel(Proposal.name) private readonly proposalModel: Model<Proposal>,
  ) {}

  // Create a new proposal
  async create(
    createProposalDto: CreateProposalDto,
    freelancerId: string,
  ): Promise<ProposalResponseDto> {
    // Check if freelancer already submitted a proposal for this job
    const existingProposal = await this.proposalModel
      .findOne({
        jobId: createProposalDto.jobId,
        freelancerId,
      })
      .exec();

    if (existingProposal) {
      throw new BadRequestException('You have already submitted a proposal for this job');
    }

    const proposal = new this.proposalModel({
      ...createProposalDto,
      freelancerId,
      status: ProposalStatus.PENDING,
    });

    const savedProposal = await proposal.save();

    // Populate freelancer and job data
    const populatedProposal = await this.proposalModel
      .findById(savedProposal._id)
      .populate('freelancerId', 'email profile.firstName profile.lastName')
      .populate('jobId', 'title clientId')
      .lean()
      .exec();

    return this.mapToProposalResponseDto(populatedProposal);
  }

  // Get proposals for a specific job
  async findByJobId(
    jobId: string,
    clientId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<ProposalsListResponseDto> {
    const skip = (page - 1) * limit;

    const [proposals, total] = await Promise.all([
      this.proposalModel
        .find({ jobId })
        .populate('freelancerId', 'email profile.firstName profile.lastName')
        .populate('jobId', 'title')
        .lean()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.proposalModel.countDocuments({ jobId }).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      proposals: proposals.map((proposal) => this.mapToProposalResponseDto(proposal)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Get current user's proposals
  async findMyProposals(
    freelancerId: string,
    page: number = 1,
    limit: number = 10,
    status?: ProposalStatus,
  ): Promise<ProposalsListResponseDto> {
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = { freelancerId };
    if (status) filter.status = status;

    const [proposals, total] = await Promise.all([
      this.proposalModel
        .find(filter)
        .populate('jobId', 'title status budget category')
        .lean()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.proposalModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      proposals: proposals.map((proposal) => this.mapToProposalResponseDto(proposal)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Get a proposal by ID
  async findOne(id: string, userId: string): Promise<ProposalResponseDto> {
    const proposal = await this.proposalModel
      .findById(id)
      .populate('freelancerId', 'email profile.firstName profile.lastName')
      .populate('jobId', 'title clientId')
      .lean()
      .exec();

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Check if user is the freelancer or the job client
    const job = proposal.jobId as any;
    if (
      proposal.freelancerId._id.toString() !== userId &&
      job.clientId?.toString() !== userId
    ) {
      throw new ForbiddenException('You are not authorized to view this proposal');
    }

    return this.mapToProposalResponseDto(proposal);
  }

  // Update a proposal
  async update(
    id: string,
    updateProposalDto: UpdateProposalDto,
    freelancerId: string,
  ): Promise<ProposalResponseDto> {
    const proposal = await this.proposalModel.findById(id).exec();

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Check if user is the owner
    if (proposal.freelancerId.toString() !== freelancerId) {
      throw new ForbiddenException('You are not authorized to update this proposal');
    }

    // Check if proposal can be modified
    if (proposal.status !== ProposalStatus.PENDING) {
      throw new BadRequestException('Proposal cannot be modified');
    }

    // Update proposal - only update provided fields
    const updateData: any = {};

    if (updateProposalDto.coverLetter !== undefined) {
      updateData.coverLetter = updateProposalDto.coverLetter;
    }

    if (updateProposalDto.proposedRate !== undefined) {
      updateData.proposedRate = updateProposalDto.proposedRate;
    }

    if (updateProposalDto.estimatedDuration !== undefined) {
      updateData.estimatedDuration = updateProposalDto.estimatedDuration;
    }

    if (updateProposalDto.proposedMilestones !== undefined) {
      updateData.proposedMilestones = updateProposalDto.proposedMilestones;
    }

    if (updateProposalDto.attachments !== undefined) {
      updateData.attachments = updateProposalDto.attachments;
    }

    const updatedProposal = await this.proposalModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
      .populate('freelancerId', 'email profile.firstName profile.lastName')
      .populate('jobId', 'title clientId')
      .exec();

    if (!updatedProposal) {
      throw new NotFoundException('Proposal not found');
    }

    return this.mapToProposalResponseDto(updatedProposal);
  }

  // Delete a proposal
  async remove(id: string, freelancerId: string): Promise<MessageResponseDto> {
    const proposal = await this.proposalModel.findById(id).exec();

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Check if user is the owner
    if (proposal.freelancerId.toString() !== freelancerId) {
      throw new ForbiddenException('You are not authorized to delete this proposal');
    }

    // Check if proposal can be deleted
    if (proposal.status !== ProposalStatus.PENDING) {
      throw new BadRequestException('Proposal cannot be deleted');
    }

    await this.proposalModel.findByIdAndDelete(id).exec();

    return { message: 'Proposal deleted successfully' };
  }

  // Helper method to map to response DTO
  private mapToProposalResponseDto(proposal: any): ProposalResponseDto {
    return {
      _id: proposal._id?.toString(),
      jobId: proposal.jobId?._id?.toString() || proposal.jobId?.toString(),
      freelancerId: proposal.freelancerId?._id?.toString() || proposal.freelancerId?.toString(),
      coverLetter: proposal.coverLetter,
      proposedRate: proposal.proposedRate,
      estimatedDuration: proposal.estimatedDuration,
      proposedMilestones: proposal.proposedMilestones || [],
      attachments: proposal.attachments || [],
      status: proposal.status,
      clientViewed: proposal.clientViewed,
      clientViewedAt: proposal.clientViewedAt,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
    };
  }
}