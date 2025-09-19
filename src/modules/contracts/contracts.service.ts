import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types, ClientSession } from "mongoose";
import { Contract, Milestone, Proposal, User, Job } from "src/database/schemas";
import { CreateContractDto } from "./dto";
import { ContractStatus } from "src/common/enums";
import { LoggerService } from "src/services/logger/logger.service";
import { PdfService } from "src/services/pdf/pdf.service";
import { PaginationDto, PaginationResult } from "src/common/dto";


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
  ) {}

 async createContract(contractData: CreateContractDto, clientId: string): Promise<Contract> {
    const session: ClientSession = await this.contractModel.db.startSession();
    session.startTransaction();

    try {
      const proposal = await this.proposalModel.findById(contractData.proposalId).session(session);
      if (!proposal) {
        throw new NotFoundException('Proposal not found');
      }

      const job = await this.jobModel.findById(proposal.jobId).session(session);
      if (!job) {
        throw new NotFoundException('Job not found');
      }
      if (job.clientId.toString() !== clientId) {
        throw new BadRequestException('Unauthorized: Client does not own this job');
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
      contract.hourlyRate = proposal.proposedRate.type === 'hourly' ? proposal.proposedRate.amount : 0;
      contract.startDate = contractData.startDate;
      contract.endDate = contractData.endDate;
      contract.status = ContractStatus.PENDING;
      contract.platformFeePercentage = 10;
      contract.totalPaid = 0;
      contract.milestoneCount = 0;
      contract.terms = contractData.terms || '';
      contract.isClientSigned = false;
      contract.isFreelancerSigned = false;

      await contract.save({ session });

      job.contractId = contract._id as Types.ObjectId;
      await job.save({ session });

      await session.commitTransaction();

      this.logger.log(`Contract created successfully: ${contract._id}`, 'ContractsService');

      return contract.toObject();
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Failed to create contract: ${error.message}`, error.stack, 'ContractsService');
      throw error;
    } finally {
      session.endSession();
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
    return contract.toObject();
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
    return contract.toObject();
  }

  async getContractById(contractId: string, userId: string): Promise<Contract> {
    const contract = await this.contractModel.findById(contractId).lean();
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }
    if (contract.clientId.toString() !== userId && contract.freelancerId.toString() !== userId) {
      throw new UnauthorizedException('Unauthorized: User is not part of this contract');
    }

    // Convert ObjectIds to strings to avoid Buffer serialization issues
    if (contract._id && typeof contract._id !== 'string') {
      (contract as any)._id = contract._id.toString();
    }
    if (contract.proposalId && typeof contract.proposalId !== 'string') {
      (contract as any).proposalId = contract.proposalId.toString();
    }

    return contract;
  }

  async getContractsForUser(userId: string, pagination: PaginationDto): Promise<PaginationResult<Contract>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const filter = {
      $or: [{ clientId: userId }, { freelancerId: userId }],
    };

    const [contracts, total] = await Promise.all([
      this.contractModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      this.contractModel.countDocuments(filter),
    ]);

   
    contracts.forEach((contract: any) => {
      if (contract._id && typeof contract._id !== 'string') {
        contract._id = contract._id.toString();
      }
      if (contract.proposalId && typeof contract.proposalId !== 'string') {
        contract.proposalId = contract.proposalId.toString();
      }
    });

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
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

      this.logger.log(`Contract completed successfully: ${contract._id} by user: ${userId}`, 'ContractsService');
      return contract.toObject();
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
    this.logger.log(`Contract cancelled successfully: ${contract._id}`, 'ContractsService');
    return contract.toObject();
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