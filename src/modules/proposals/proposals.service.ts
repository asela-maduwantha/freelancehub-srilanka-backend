import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
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
  ProposalJobResponseDto,
  ProposalFreelancerResponseDto,
  ProposalClientResponseDto,
} from './dto/proposal-response.dto';
import { ProposalStatus } from '../../common/enums/proposal-status.enum';
import { ContractStatus } from '../../common/enums/contract-status.enum';
import { JobStatus } from '../../common/enums/job-status.enum';
import { ContractsService } from '../contracts/contracts.service';
import { LoggerService } from '../../services/logger/logger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MessageResponseDto } from 'src/common/dto';

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
    private readonly notificationsService: NotificationsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Clear all cached proposal lists for a specific job
   * This invalidates the cache when proposals are modified
   */
  private async clearJobProposalCache(jobId: string): Promise<void> {
    try {
      // Since we can't easily list all cache keys, we'll clear common patterns
      // The cache keys follow pattern: proposals_job:{jobId}:{page}:{limit}
      // We'll clear first few pages which are most commonly accessed
      const cacheKeys = [
        `proposals_job:${jobId}:1:10`,
        `proposals_job:${jobId}:1:20`,
        `proposals_job:${jobId}:1:50`,
        `proposals_job:${jobId}:2:10`,
        `proposals_job:${jobId}:2:20`,
        `proposals_job:${jobId}:3:10`,
      ];

      await Promise.all(
        cacheKeys.map(key => this.cacheManager.del(key))
      );

      this.logger.log(`Cleared proposal cache for job ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to clear proposal cache for job ${jobId}:`, error);
    }
  }

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

    // Populate freelancer, job, and client data
    const populatedProposal = await this.proposalModel
      .findById(savedProposal._id)
      .populate('freelancerId', 'email profile.firstName profile.lastName profile.title profile.skills profile.avatar')
      .populate({
        path: 'jobId',
        select: 'title category subcategory projectType budget clientId',
        populate: {
          path: 'clientId',
          select: 'email profile.firstName profile.lastName profile.avatar'
        }
      })
      .lean()
      .exec();

    // Send notification to client about new proposal
    try {
      if (populatedProposal) {
        const job = populatedProposal.jobId as any;
        const clientId = job.clientId._id || job.clientId;
        await this.notificationsService.notifyProposalReceived(
          (savedProposal._id as Types.ObjectId).toString(),
          job.title,
          clientId.toString()
        );
      }
    } catch (error) {
      // Log error but don't fail proposal creation
      console.error('Failed to send proposal received notification:', error);
    }

    // Clear job proposal cache since new proposal was added
    await this.clearJobProposalCache(createProposalDto.jobId.toString());

    return this.mapToProposalResponseDto(populatedProposal);
  }

  async findByJobId(
    jobId: string,
    clientId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<ProposalsListResponseDto> {
    // Create cache key from search parameters
    const cacheKey = `proposals_job:${jobId}:${page}:${limit}`;

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<ProposalsListResponseDto>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const skip = (page - 1) * limit;

    const [proposals, total] = await Promise.all([
      this.proposalModel
        .find({ jobId })
        .populate('freelancerId', 'email profile.firstName profile.lastName profile.title profile.skills profile.avatar')
        .populate({
          path: 'jobId',
          select: 'title category subcategory projectType budget clientId',
          populate: {
            path: 'clientId',
            select: 'email profile.firstName profile.lastName profile.avatar'
          }
        })
        .lean()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.proposalModel.countDocuments({ jobId }).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    const result = {
      proposals: proposals.map((proposal) =>
        this.mapToProposalResponseDto(proposal),
      ),
      total,
      page,
      limit,
      totalPages,
    };

    // Cache for 5 minutes (proposals change moderately frequently)
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  async findMyProposals(
    freelancerId: string,
    page: number = 1,
    limit: number = 10,
    status?: ProposalStatus,
  ): Promise<ProposalsListResponseDto> {
    // Create cache key from search parameters
    const cacheKey = `proposals_freelancer:${freelancerId}:${page}:${limit}:${status || 'all'}`;

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<ProposalsListResponseDto>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const skip = (page - 1) * limit;

    const filter: any = { freelancerId };
    if (status) filter.status = status;

    const [proposals, total] = await Promise.all([
      this.proposalModel
        .find(filter)
        .populate('freelancerId', 'email profile.firstName profile.lastName profile.title profile.skills profile.avatar')
        .populate({
          path: 'jobId',
          select: 'title category subcategory projectType budget clientId',
          populate: {
            path: 'clientId',
            select: 'email profile.firstName profile.lastName profile.avatar'
          }
        })
        .lean()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.proposalModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    const result = {
      proposals: proposals.map((proposal) =>
        this.mapToProposalResponseDto(proposal),
      ),
      total,
      page,
      limit,
      totalPages,
    };

    // Cache for 5 minutes (proposals change moderately frequently)
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  async findOne(id: string, userId: string): Promise<ProposalResponseDto> {
    // Create cache key
    const cacheKey = `proposal:${id}`;

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<ProposalResponseDto>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const proposal = await this.proposalModel
      .findById(id)
      .populate('freelancerId', 'email profile.firstName profile.lastName profile.title profile.skills profile.avatar')
      .populate({
        path: 'jobId',
        select: 'title category subcategory projectType budget clientId',
        populate: {
          path: 'clientId',
          select: 'email profile.firstName profile.lastName profile.avatar'
        }
      })
      .lean()
      .exec();

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const job = proposal.jobId as any;
    if (
      proposal.freelancerId._id.toString() !== userId &&
      job.clientId?._id?.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You are not authorized to view this proposal',
      );
    }

    const proposalResponse = this.mapToProposalResponseDto(proposal);

    // Cache for 10 minutes (individual proposals change less frequently)
    await this.cacheManager.set(cacheKey, proposalResponse, 600000);

    return proposalResponse;
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
      .populate('freelancerId', 'email profile.firstName profile.lastName profile.title profile.skills profile.avatar')
      .populate({
        path: 'jobId',
        select: 'title category subcategory projectType budget clientId',
        populate: {
          path: 'clientId',
          select: 'email profile.firstName profile.lastName profile.avatar'
        }
      })
      .exec();

    if (!updatedProposal) {
      throw new NotFoundException('Proposal not found');
    }

    const updatedProposalResponse = this.mapToProposalResponseDto(updatedProposal);

    // Clear cache after updating proposal
    await this.cacheManager.del(`proposal_${id}`);
    
    // Clear job proposal list cache since proposal content changed
    await this.clearJobProposalCache(updatedProposal.jobId.toString());

    return updatedProposalResponse;
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

    // Clear cache after deleting proposal
    await this.cacheManager.del(`proposal_${id}`);
    
    // Clear job proposal list cache since proposal was removed
    await this.clearJobProposalCache(proposal.jobId.toString());

    return { message: 'Proposal deleted successfully' };
  }

  async acceptProposal(
    id: string,
    clientId: string,
  ): Promise<ProposalResponseDto> {
    const proposal = await this.proposalModel
      .findById(id)
      .populate('freelancerId', 'email profile.firstName profile.lastName profile.title profile.skills profile.avatar')
      .populate({
        path: 'jobId',
        select: 'title category subcategory projectType budget clientId status',
        populate: {
          path: 'clientId',
          select: 'email profile.firstName profile.lastName profile.avatar'
        }
      })
      .exec();
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }
    const job = proposal.jobId as any;
    if (job.clientId?._id?.toString() !== clientId) {
      throw new ForbiddenException(
        'You are not authorized to accept this proposal',
      );
    }

    // Check if job is in a valid state for accepting proposals
    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException('Can only accept proposals for open jobs');
    }

    proposal.status = ProposalStatus.ACCEPTED;
    await proposal.save();

    // Reject all other proposals for this job
    await this.proposalModel.updateMany(
      {
        jobId: job._id,
        _id: { $ne: id },
        status: ProposalStatus.PENDING
      },
      { status: ProposalStatus.REJECTED }
    );

    // Update the job's selectedProposalId and status to AWAITING_CONTRACT
    await this.jobModel.findByIdAndUpdate(
      job._id,
      { 
        selectedProposalId: id,
        status: JobStatus.AWAITING_CONTRACT
      }
    );

    const proposalResponse = this.mapToProposalResponseDto(proposal);

    // Send notification to freelancer about proposal acceptance
    try {
      const job = proposal.jobId as any;
      await this.notificationsService.notifyProposalAccepted(
        id,
        job.title,
        proposal.freelancerId.toString()
      );
    } catch (error) {
      // Log error but don't fail proposal acceptance
      console.error('Failed to send proposal accepted notification:', error);
    }

    // Clear cache after accepting proposal
    await this.cacheManager.del(`proposal_${id}`);
    
    // Clear job proposal list cache since proposal status changed
    await this.clearJobProposalCache(job._id.toString());
    
    // Clear cache for other proposals that were rejected
    const otherProposals = await this.proposalModel.find({
      jobId: job._id,
      _id: { $ne: id },
      status: ProposalStatus.REJECTED
    }, '_id');
    
    for (const otherProposal of otherProposals) {
      await this.cacheManager.del(`proposal_${otherProposal._id}`);
    }

    return proposalResponse;
  }

  async rejectProposal(
    id: string,
    clientId: string,
  ): Promise<ProposalResponseDto> {
    const proposal = await this.proposalModel
      .findById(id)
      .populate('freelancerId', 'email profile.firstName profile.lastName profile.title profile.skills profile.avatar')
      .populate({
        path: 'jobId',
        select: 'title category subcategory projectType budget clientId status',
        populate: {
          path: 'clientId',
          select: 'email profile.firstName profile.lastName profile.avatar'
        }
      })
      .exec();
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }
    const job = proposal.jobId as any;
    if (job.clientId?._id?.toString() !== clientId) {
      throw new ForbiddenException(
        'You are not authorized to reject this proposal',
      );
    }
    proposal.status = ProposalStatus.REJECTED;
    await proposal.save();

    const proposalResponse = this.mapToProposalResponseDto(proposal);

    // Clear cache after rejecting proposal
    await this.cacheManager.del(`proposal_${id}`);
    
    // Clear job proposal list cache since proposal status changed
    await this.clearJobProposalCache(job._id.toString());

    return proposalResponse;
  }

  private mapToProposalResponseDto(proposal: any): ProposalResponseDto {
    const freelancer = proposal.freelancerId;
    const freelancerProfile = freelancer?.profile || {};

    const job = proposal.jobId;
    const jobClient = job?.clientId;
    const jobClientProfile = jobClient?.profile || {};

    const jobDto = new ProposalJobResponseDto();
    jobDto.id = job?._id?.toString() || '';
    jobDto.title = job?.title || '';
    jobDto.category = job?.category || '';
    jobDto.subcategory = job?.subcategory;
    jobDto.projectType = job?.projectType || '';
    jobDto.budget = job?.budget;

    const jobClientDto = new ProposalClientResponseDto();
    jobClientDto.id = jobClient?._id?.toString() || '';
    jobClientDto.email = jobClient?.email || '';
    jobClientDto.fullName = jobClient
      ? `${jobClientProfile.firstName || ''} ${jobClientProfile.lastName || ''}`.trim()
      : '';
    jobClientDto.avatar = jobClientProfile.avatar;
    jobDto.client = jobClientDto;

    const freelancerDto = new ProposalFreelancerResponseDto();
    freelancerDto.id = freelancer?._id?.toString() || '';
    freelancerDto.email = freelancer?.email || '';
    freelancerDto.fullName = freelancer
      ? `${freelancerProfile.firstName || ''} ${freelancerProfile.lastName || ''}`.trim()
      : '';
    freelancerDto.avatar = freelancerProfile.avatar;
    freelancerDto.title = freelancerProfile.title;
    freelancerDto.skills = freelancerProfile.skills;

    const result = {
      _id: proposal._id?.toString(),
      job: jobDto,
      freelancer: freelancerDto,
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

    // Use JSON.parse(JSON.stringify()) to remove any potential circular references
    // from populated Mongoose documents that might cause class-transformer recursion
    return JSON.parse(JSON.stringify(result));
  }
}
