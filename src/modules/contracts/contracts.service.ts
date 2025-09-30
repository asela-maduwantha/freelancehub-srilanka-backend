import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, Inject } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types, ClientSession } from "mongoose";
import { Contract, Milestone, Proposal, User, Job } from "src/database/schemas";
import { CreateContractDto, ContractQueryDto } from "./dto";
import { ContractStatus } from "src/common/enums";
import { LoggerService } from "src/services/logger/logger.service";
import { PdfService } from "src/services/pdf/pdf.service";
import { PaginationDto, PaginationResult } from "src/common/dto";
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { JobStatus } from '../../common/enums/job-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { MilestoneStatus } from '../../common/enums/milestone-status.enum';


@Injectable()
export class ContractsService {
   constructor(
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    @InjectModel(Milestone.name) private milestoneModel: Model<Milestone>,
    @InjectModel(Job.name) private jobModel: Model<Job>,
    @InjectModel(Proposal.name) private proposalModel: Model<Proposal>,
    @InjectModel(User.name) private userModel: Model<User>,
    private logger: LoggerService,
    private pdfService: PdfService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Safely converts ObjectId fields to strings to prevent Buffer serialization issues
   */
  private sanitizeContract(contract: any): any {
    if (!contract) return contract;
    
    const sanitized = JSON.parse(JSON.stringify(contract));
    
    // List of ObjectId fields that need conversion
    const objectIdFields = ['_id', 'id'];
    
    objectIdFields.forEach(field => {
      if (sanitized[field]) {
        if (typeof sanitized[field] === 'string') {
          // Already a string, keep as is
          return;
        } else if (sanitized[field]._id) {
          // Mongoose document with _id
          sanitized[field] = sanitized[field]._id.toString();
        } else if (sanitized[field].toString) {
          // ObjectId instance
          sanitized[field] = sanitized[field].toString();
        } else if (sanitized[field].buffer && sanitized[field].buffer.data) {
          // Buffer object - convert back to ObjectId string
          const bytes = sanitized[field].buffer.data;
          const hex = bytes.map((b: number) => b.toString(16).padStart(2, '0')).join('');
          sanitized[field] = hex;
        }
      }
    });
    
    return sanitized;
  }

 async createContract(contractData: CreateContractDto, clientId: string): Promise<Contract> {
  try {
    const proposal = await this.proposalModel.findById(contractData.proposalId);
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Validate proposal status
    if (proposal.status !== 'accepted') {
      throw new BadRequestException('Can only create contract from accepted proposal');
    }

    const job = await this.jobModel.findById(proposal.jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Validate job status
    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException('Can only create contract for open jobs');
    }

    if (job.clientId.toString() !== clientId) {
      throw new BadRequestException('Unauthorized: Client does not own this job');
    }

    // Validate date ranges
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    if (contractData.startDate < tomorrow) {
      throw new BadRequestException('Contract start date must be at least tomorrow');
    }

    if (contractData.endDate <= contractData.startDate) {
      throw new BadRequestException('Contract end date must be after start date');
    }

    const maxEndDate = new Date(contractData.startDate);
    maxEndDate.setFullYear(maxEndDate.getFullYear() + 2);
    if (contractData.endDate > maxEndDate) {
      throw new BadRequestException('Contract duration cannot exceed 2 years');
    }

    // Validate milestones if provided
    if (contractData.milestones && contractData.milestones.length > 0) {
      const totalMilestoneAmount = contractData.milestones.reduce((sum, milestone) => sum + milestone.amount, 0);

      // Check if total milestone amount exceeds contract amount
      if (totalMilestoneAmount > proposal.proposedRate.amount) {
        throw new BadRequestException(
          `Total milestone amount (${totalMilestoneAmount}) cannot exceed contract amount (${proposal.proposedRate.amount})`
        );
      }

      // Validate individual milestones
      for (const milestone of contractData.milestones) {
        if (milestone.amount <= 0) {
          throw new BadRequestException('Milestone amount must be greater than 0');
        }
        if (!milestone.title || milestone.title.trim().length === 0) {
          throw new BadRequestException('Milestone title is required');
        }
        if (!milestone.description || milestone.description.trim().length === 0) {
          throw new BadRequestException('Milestone description is required');
        }
      }
    }

    const contract = new this.contractModel();

    contract.proposalId = proposal._id as Types.ObjectId;
    contract.jobId = job._id as Types.ObjectId;
    contract.clientId = job.clientId;
    contract.freelancerId = proposal.freelancerId;
    contract.title = job.title;
    contract.description = job.description;
    contract.contractType = job.projectType;
    contract.totalAmount = proposal.proposedRate.amount;
    contract.currency = proposal.proposedRate.currency;
    contract.startDate = contractData.startDate;
    contract.endDate = contractData.endDate;
    contract.status = ContractStatus.ACTIVE;
    contract.platformFeePercentage = 10;
    contract.totalPaid = 0;
    contract.milestoneCount = 0;
    contract.terms = contractData.terms || '';
    contract.isClientSigned = true;
    contract.isFreelancerSigned = false;

    await contract.save();

    // Create milestones if provided
    let milestoneCount = 0;
    if (contractData.milestones && contractData.milestones.length > 0) {
      const milestones = contractData.milestones.map((milestoneData, index) => {
        // Calculate due date based on contract start date and milestone duration
        let dueDate: Date | undefined;
        if (milestoneData.durationDays) {
          dueDate = new Date(contractData.startDate);
          dueDate.setDate(dueDate.getDate() + milestoneData.durationDays);
        }

        return {
          contractId: contract._id,
          title: milestoneData.title,
          description: milestoneData.description,
          amount: milestoneData.amount,
          currency: milestoneData.currency || 'USD',
          order: index + 1,
          dueDate,
          status: MilestoneStatus.PENDING,
          isCompleted: false,
          completedAt: null,
          deliverables: [],
        };
      });

      // Create all milestones
      await this.milestoneModel.insertMany(milestones);
      milestoneCount = milestones.length;

      // Update contract milestone count
      contract.milestoneCount = milestoneCount;
      await contract.save();
    }

    // Send notification to freelancer about contract creation
    try {
      await this.notificationsService.notifyContractCreated(
        (contract._id as Types.ObjectId).toString(),
        job.title,
        proposal.freelancerId.toString()
      );
    } catch (notificationError) {
      this.logger.error(`Failed to send contract creation notification: ${notificationError.message}`, notificationError.stack, 'ContractsService');
      // Don't throw - notification failure shouldn't break contract creation
    }

    job.contractId = contract._id as Types.ObjectId;
    await job.save();

    this.logger.log(`Contract created successfully: ${contract._id}`, 'ContractsService');

    // Populate related data before returning
    const populatedContract = await this.contractModel
      .findById(contract._id)
      .populate('clientId', 'email profile.firstName profile.lastName profile.avatar')
      .populate('freelancerId', 'email profile.firstName profile.lastName profile.title profile.skills profile.avatar')
      .populate('jobId', 'title category subcategory projectType budget')
      .populate('proposalId', 'proposedRate status')
      .exec();

    if (!populatedContract) {
      throw new NotFoundException('Contract not found after creation');
    }

    return populatedContract.toObject();
  } catch (error) {
    this.logger.error(`Failed to create contract: ${error.message}`, error.stack, 'ContractsService');
    throw error;
  }
}

  async startContract(contractId: string, userId: string): Promise<Contract> {
    const contract = await this.contractModel.findById(contractId);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.clientId.toString() !== userId) {
      throw new UnauthorizedException('Unauthorized: User is not part of this contract');
    }

    contract.status = ContractStatus.ACTIVE;
    contract.startDate = new Date();
    contract.isClientSigned = true;
    await contract.save();
    this.logger.log(`Contract started successfully: ${contract._id}`, 'ContractsService');

    // Populate related data before returning
    const populatedContract = await this.contractModel
      .findById(contract._id)
      .populate('clientId', 'email profile.firstName profile.lastName profile.avatar')
      .populate('freelancerId', 'email profile.firstName profile.lastName profile.title profile.skills profile.avatar')
      .populate('jobId', 'title category subcategory projectType budget')
      .populate('proposalId', 'proposedRate status')
      .exec();

    if (!populatedContract) {
      throw new NotFoundException('Contract not found after update');
    }

    const result = populatedContract.toObject();

    // Clear cache after starting contract
    await this.cacheManager.del(`contract:${contractId}`);

    return result;
  }

  async freelancerSignContract(contractId: string, userId: string): Promise<Contract> {
    const contract = await this.contractModel.findById(contractId);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }
    if (contract.freelancerId.toString() !== userId) {
      throw new UnauthorizedException('Unauthorized: User is not part of this contract');
    }

    contract.isFreelancerSigned = true;
    await contract.save();
    this.logger.log(`Contract signed by freelancer: ${contract._id}`, 'ContractsService');

    // Populate related data before returning
    const populatedContract = await this.contractModel
      .findById(contract._id)
      .populate('clientId', 'email profile.firstName profile.lastName profile.avatar')
      .populate('freelancerId', 'email profile.firstName profile.lastName profile.title profile.skills profile.avatar')
      .populate('jobId', 'title category subcategory projectType budget')
      .populate('proposalId', 'proposedRate status')
      .exec();

    if (!populatedContract) {
      throw new NotFoundException('Contract not found after update');
    }

    const result = populatedContract.toObject();

    // Clear cache after signing contract
    await this.cacheManager.del(`contract:${contractId}`);

    return result;
  }

  async getContractById(contractId: string, userId: string): Promise<Contract> {
    // Create cache key
    const cacheKey = `contract:v2:${contractId}`;

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<Contract>(cacheKey);
    if (cachedResult) {
      return this.sanitizeContract(cachedResult);
    }

    const contract = await this.contractModel
      .findById(contractId)
      .populate('clientId', 'email profile.firstName profile.lastName profile.avatar')
      .populate('freelancerId', 'email profile.firstName profile.lastName profile.title profile.skills profile.avatar')
      .populate('jobId', 'title category subcategory projectType budget')
      .populate('proposalId', 'proposedRate status')
      .exec();

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }
    if (contract.clientId._id.toString() !== userId && contract.freelancerId._id.toString() !== userId) {
      throw new UnauthorizedException('Unauthorized: User is not part of this contract');
    }

    const contractObject = contract.toObject();

    // Sanitize to ensure ObjectIds are strings
    const sanitizedContract = this.sanitizeContract(contractObject);

    // Cache for 10 minutes (contracts don't change frequently)
    await this.cacheManager.set(cacheKey, sanitizedContract, 600000);

    return sanitizedContract;
  }

  async getContractsForUser(userId: string, query: ContractQueryDto): Promise<PaginationResult<Contract>> {
    const { page = 1, limit = 10, status, contractType, clientId, freelancerId, jobId, search } = query;
    const skip = (page - 1) * limit;

    // Create cache key from search parameters
    const cacheKey = `contracts_user:v2:${userId}:${JSON.stringify(query)}`;

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<PaginationResult<Contract>>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const filter: any = {
      $or: [{ clientId: userId }, { freelancerId: userId }],
    };

    // Apply additional filters
    if (status) {
      filter.status = status;
    }
    if (contractType) {
      filter.contractType = contractType;
    }
    if (clientId) {
      filter.clientId = clientId;
    }
    if (freelancerId) {
      filter.freelancerId = freelancerId;
    }
    if (jobId) {
      filter.jobId = jobId;
    }

    // Add search functionality
    if (search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const [contractDocs, total] = await Promise.all([
      this.contractModel
        .find(filter)
        .populate('clientId', 'email profile.firstName profile.lastName profile.avatar')
        .populate('freelancerId', 'email profile.firstName profile.lastName profile.title profile.skills profile.avatar')
        .populate('jobId', 'title category subcategory projectType budget')
        .populate('proposalId', 'proposedRate status')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.contractModel.countDocuments(filter),
    ]);

    const contracts = contractDocs.map(contract => contract.toObject());

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const result = {
      data: contracts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };

    // Cache for 5 minutes (contract lists change moderately frequently)
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  async completeContract(contractId: string, userId: string): Promise<Contract> {
    const session: ClientSession = await this.contractModel.db.startSession();
    session.startTransaction();

    try {
      const contract = await this.contractModel.findById(contractId).session(session);
      if (!contract) {
        throw new NotFoundException('Contract not found');
      }

      if (contract.status !== ContractStatus.ACTIVE) {
        throw new BadRequestException(`Cannot complete contract with status: ${contract.status}`);
      }

      if (contract.clientId.toString() !== userId) {
        throw new UnauthorizedException('Unauthorized: Only the client can complete this contract');
      }

      const freelancer = await this.userModel.findById(contract.freelancerId).session(session);

      if (!freelancer) {
        throw new NotFoundException('Associated user not found');
      }

      contract.status = ContractStatus.COMPLETED;
      contract.endDate = new Date();
      await contract.save({ session });

      if (freelancer.freelancerData) {
        freelancer.freelancerData.completedJobs = (freelancer.freelancerData.completedJobs || 0) + 1;
        await freelancer.save({ session });
      }

      await session.commitTransaction();

      // Send notification to freelancer about contract completion
      try {
        await this.notificationsService.notifyContractCompleted(
          (contract._id as Types.ObjectId).toString(),
          contract.title,
          contract.freelancerId.toString()
        );
      } catch (notificationError) {
        this.logger.error(`Failed to send contract completion notification: ${notificationError.message}`, notificationError.stack, 'ContractsService');
        // Don't throw - notification failure shouldn't break contract completion
      }

      this.logger.log(`Contract completed successfully: ${contract._id} by user: ${userId}`, 'ContractsService');

      // Populate related data before returning
      const populatedContract = await this.contractModel
        .findById(contract._id)
        .populate('clientId', 'email profile.firstName profile.lastName profile.avatar')
        .populate('freelancerId', 'email profile.firstName profile.lastName profile.title profile.skills profile.avatar')
        .populate('jobId', 'title category subcategory projectType budget')
        .populate('proposalId', 'proposedRate status')
        .exec();

      if (!populatedContract) {
        throw new NotFoundException('Contract not found after completion');
      }

      const result = populatedContract.toObject();

      // Clear cache after completing contract
      await this.cacheManager.del(`contract:${contractId}`);

      return result;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Failed to complete contract ${contractId}: ${error.message}`, error.stack, 'ContractsService');
      throw error;
    } finally {
      session.endSession();
    }
  }

  async cancelContract(contractId: string, userId: string): Promise<Contract> {
    const contract = await this.contractModel.findById(contractId);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.clientId.toString() !== userId && contract.freelancerId.toString() !== userId) {
      throw new UnauthorizedException('Unauthorized: User is not part of this contract');
    }
    contract.status = ContractStatus.CANCELLED;
    await contract.save();

    // Send notifications to both client and freelancer about contract cancellation
    try {
      await Promise.all([
        this.notificationsService.notifyContractCancelled(
          (contract._id as Types.ObjectId).toString(),
          contract.title,
          contract.clientId.toString()
        ),
        this.notificationsService.notifyContractCancelled(
          (contract._id as Types.ObjectId).toString(),
          contract.title,
          contract.freelancerId.toString()
        )
      ]);
    } catch (notificationError) {
      this.logger.error(`Failed to send contract cancellation notifications: ${notificationError.message}`, notificationError.stack, 'ContractsService');
      // Don't throw - notification failure shouldn't break contract cancellation
    }

    this.logger.log(`Contract cancelled successfully: ${contract._id}`, 'ContractsService');

    // Populate related data before returning
    const populatedContract = await this.contractModel
      .findById(contract._id)
      .populate('clientId', 'email profile.firstName profile.lastName profile.avatar')
      .populate('freelancerId', 'email profile.firstName profile.lastName profile.title profile.skills profile.avatar')
      .populate('jobId', 'title category subcategory projectType budget')
      .populate('proposalId', 'proposedRate status')
      .exec();

    if (!populatedContract) {
      throw new NotFoundException('Contract not found after cancellation');
    }

    const result = populatedContract.toObject();

    // Clear cache after cancelling contract
    await this.cacheManager.del(`contract:${contractId}`);

    return result;
  }

  async downloadContract(contractId: string, userId: string): Promise<Buffer> {
    const contract = await this.contractModel.findById(contractId);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }
    if (contract.clientId.toString() !== userId && contract.freelancerId.toString() !== userId) {
      throw new UnauthorizedException('Unauthorized: User is not part of this contract');
    }

    // Fetch related data
    const [client, freelancer, job, proposal] = await Promise.all([
      this.userModel.findById(contract.clientId),
      this.userModel.findById(contract.freelancerId),
      this.jobModel.findById(contract.jobId),
      this.proposalModel.findById(contract.proposalId),
    ]);

    if (!client || !freelancer || !job || !proposal) {
      throw new NotFoundException('Related data not found');
    }

    const pdfBuffer = await this.pdfService.generateComprehensiveContractPdf(
      contract,
      client,
      freelancer,
      job,
      proposal,
    );

    this.logger.log(`Comprehensive contract PDF generated for contract: ${contract._id}`, 'ContractsService');
    return pdfBuffer;
  }
}