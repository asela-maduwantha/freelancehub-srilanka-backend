import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { Proposal } from '../../database/schemas/proposal.schema';
import { Job } from '../../database/schemas/job.schema';
import { Contract } from '../../database/schemas/contract.schema';
import { Milestone } from '../../database/schemas/milestone.schema';
import { User } from '../../database/schemas/user.schema';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import {
  ProposalResponseDto,
  ProposalsListResponseDto,
  MessageResponseDto,
} from './dto/proposal-response.dto';
import { ProposalStatus } from '../../common/enums/proposal-status.enum';
import { ContractStatus } from '../../common/enums/contract-status.enum';
import { ContractsService } from '../contracts/contracts.service';
import { LoggerService } from '../../services/logger/logger.service';

@Injectable()
export class ProposalsService {
  constructor(
    @InjectModel(Proposal.name) private readonly proposalModel: Model<Proposal>,
    @InjectModel(Job.name) private readonly jobModel: Model<Job>,
    @InjectModel(Contract.name) private readonly contractModel: Model<Contract>,
    @InjectModel(Milestone.name) private readonly milestoneModel: Model<Milestone>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly contractsService: ContractsService,
    private readonly logger: LoggerService,
  ) {}

  async create(
    createProposalDto: CreateProposalDto,
    freelancerId: string,
  ): Promise<ProposalResponseDto> {
    const existingProposal = await this.proposalModel
      .findOne({
        jobId: createProposalDto.jobId,
        freelancerId,
      })
      .exec();

    if (existingProposal) {
      throw new BadRequestException(
        'You have already submitted a proposal for this job',
      );
    }

    const proposal = new this.proposalModel({
      ...createProposalDto,
      freelancerId,
      status: ProposalStatus.PENDING,
    });

    const savedProposal = await proposal.save();

    // Increment proposal count for the job
    await this.jobModel.findByIdAndUpdate(
      createProposalDto.jobId,
      { $inc: { proposalCount: 1 } },
      { new: true }
    ).exec();

    // Populate freelancer and job data
    const populatedProposal = await this.proposalModel
      .findById(savedProposal._id)
      .populate('freelancerId', 'email profile.firstName profile.lastName')
      .populate('jobId', 'title clientId')
      .lean()
      .exec();

    return this.mapToProposalResponseDto(populatedProposal);
  }

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
      proposals: proposals.map((proposal) =>
        this.mapToProposalResponseDto(proposal),
      ),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findMyProposals(
    freelancerId: string,
    page: number = 1,
    limit: number = 10,
    status?: ProposalStatus,
  ): Promise<ProposalsListResponseDto> {
    const skip = (page - 1) * limit;

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
      proposals: proposals.map((proposal) =>
        this.mapToProposalResponseDto(proposal),
      ),
      total,
      page,
      limit,
      totalPages,
    };
  }

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

    const job = proposal.jobId as any;
    if (
      proposal.freelancerId._id.toString() !== userId &&
      job.clientId?.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You are not authorized to view this proposal',
      );
    }

    return this.mapToProposalResponseDto(proposal);
  }

  async update(
    id: string,
    updateProposalDto: UpdateProposalDto,
    freelancerId: string,
  ): Promise<ProposalResponseDto> {
    const proposal = await this.proposalModel.findById(id).exec();

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.freelancerId.toString() !== freelancerId) {
      throw new ForbiddenException(
        'You are not authorized to update this proposal',
      );
    }

    if (proposal.status !== ProposalStatus.PENDING) {
      throw new BadRequestException('Proposal cannot be modified');
    }

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
      .findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .populate('freelancerId', 'email profile.firstName profile.lastName')
      .populate('jobId', 'title clientId')
      .exec();

    if (!updatedProposal) {
      throw new NotFoundException('Proposal not found');
    }

    return this.mapToProposalResponseDto(updatedProposal);
  }

  async remove(id: string, freelancerId: string): Promise<MessageResponseDto> {
    const proposal = await this.proposalModel.findById(id).exec();

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.freelancerId.toString() !== freelancerId) {
      throw new ForbiddenException(
        'You are not authorized to delete this proposal',
      );
    }

    if (proposal.status !== ProposalStatus.PENDING) {
      throw new BadRequestException('Proposal cannot be deleted');
    }

    await this.proposalModel.findByIdAndDelete(id).exec();

    // Decrement proposal count for the job
    await this.jobModel.findByIdAndUpdate(
      proposal.jobId,
      { $inc: { proposalCount: -1 } },
      { new: true }
    ).exec();

    return { message: 'Proposal deleted successfully' };
  }

  async acceptProposal(
    id: string,
    clientId: string,
  ): Promise<ProposalResponseDto> {
    const proposal = await this.proposalModel
      .findById(id)
      .populate('jobId', 'clientId status')
      .exec();
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }
    const job = proposal.jobId as any;
    if (job.clientId?.toString() !== clientId) {
      throw new ForbiddenException(
        'You are not authorized to accept this proposal',
      );
    }

    proposal.status = ProposalStatus.ACCEPTED;
    await proposal.save();

    return this.mapToProposalResponseDto(proposal);
  }

  async rejectProposal(
    id: string,
    clientId: string,
  ): Promise<ProposalResponseDto> {
    const proposal = await this.proposalModel
      .findById(id)
      .populate('jobId', 'clientId status')
      .exec();
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }
    const job = proposal.jobId as any;
    if (job.clientId?.toString() !== clientId) {
      throw new ForbiddenException(
        'You are not authorized to reject this proposal',
      );
    }
    proposal.status = ProposalStatus.REJECTED;
    await proposal.save();
    return this.mapToProposalResponseDto(proposal);
  }

  private mapToProposalResponseDto(proposal: any): ProposalResponseDto {
    return {
      _id: proposal._id?.toString(),
      jobId: proposal.jobId?._id?.toString() || proposal.jobId?.toString(),
      freelancerId:
        proposal.freelancerId?._id?.toString() ||
        proposal.freelancerId?.toString(),
      coverLetter: proposal.coverLetter,
      proposedRate: {
        amount: proposal.proposedRate?.amount,
        type: proposal.proposedRate?.type,
        currency: proposal.proposedRate?.currency,
      },
      estimatedDuration: proposal.estimatedDuration ? {
        value: proposal.estimatedDuration.value,
        unit: proposal.estimatedDuration.unit,
      } : undefined,
      proposedMilestones: (proposal.proposedMilestones || []).map((milestone: any) => ({
        title: milestone.title,
        description: milestone.description,
        amount: milestone.amount,
        durationDays: milestone.durationDays,
      })),
      attachments: (proposal.attachments || []).map((attachment: any) => ({
        filename: attachment.filename,
        url: attachment.url,
        size: attachment.size,
        type: attachment.type,
      })),
      status: proposal.status,
      clientViewed: proposal.clientViewed,
      clientViewedAt: proposal.clientViewedAt,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
    };
  }
}
