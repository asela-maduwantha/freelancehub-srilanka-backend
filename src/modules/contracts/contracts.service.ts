import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, Inject } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types, ClientSession } from "mongoose";
import { Contract, Milestone, Proposal, User, Job, Payment } from "src/database/schemas";
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
import { StripeService } from '../../services/stripe/stripe.service';
import { PaymentMethodsService } from '../payment-methods/payment-methods.service';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { TransactionLogService } from '../payments/transaction-log.service';


@Injectable()
export class ContractsService {
   constructor(
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    @InjectModel(Milestone.name) private milestoneModel: Model<Milestone>,
    @InjectModel(Job.name) private jobModel: Model<Job>,
    @InjectModel(Proposal.name) private proposalModel: Model<Proposal>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    private logger: LoggerService,
    private pdfService: PdfService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private notificationsService: NotificationsService,
    private stripeService: StripeService,
    private paymentMethodsService: PaymentMethodsService,
    private transactionLogService: TransactionLogService,
  ) {}

  /**
   * Invalidate all contract-related caches
   * This should be called whenever a contract is created, updated, or deleted
   */
  private async invalidateContractCaches(contractId: string, clientId?: string, freelancerId?: string): Promise<void> {
    try {
      // Clear the specific contract cache (both v1 and v2 keys)
      await this.cacheManager.del(`contract:${contractId}`);
      await this.cacheManager.del(`contract:v2:${contractId}`);

      // Clear contract list caches for both client and freelancer
      if (clientId) {
        await this.clearUserContractListCache(clientId);
      }
      if (freelancerId) {
        await this.clearUserContractListCache(freelancerId);
      }

      this.logger.log(`Cleared contract cache for contract ${contractId}`, 'ContractsService');
    } catch (error) {
      this.logger.error(`Failed to invalidate contract caches for contract ${contractId}:`, error, 'ContractsService');
      // Don't throw - cache invalidation failures shouldn't break the operation
    }
  }

  /**
   * Clear all contract list caches for a specific user
   */
  private async clearUserContractListCache(userId: string): Promise<void> {
    try {
      // Clear contract list caches for various pagination and filter combinations
      for (let page = 1; page <= 5; page++) {
        for (const limit of [10, 20, 50]) {
          // Clear without status filter
          await this.cacheManager.del(`contracts:user:${userId}:page:${page}:limit:${limit}`);
          
          // Clear with each status
          for (const status of Object.values(ContractStatus)) {
            await this.cacheManager.del(`contracts:user:${userId}:page:${page}:limit:${limit}:status:${status}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to clear contract list cache for user ${userId}:`, error, 'ContractsService');
    }
  }

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

    if (job.clientId.toString() !== clientId) {
      throw new BadRequestException('Unauthorized: Client does not own this job');
    }

    // ATOMIC CHECK: Use findOneAndUpdate to atomically check and update job
    // This prevents race conditions where multiple requests try to create contracts simultaneously
    const updatedJob = await this.jobModel.findOneAndUpdate(
      {
        _id: job._id,
        contractId: null, // Only update if contractId is still null
        status: { $in: [JobStatus.IN_PROGRESS, JobStatus.AWAITING_CONTRACT] } // Validate status atomically
      },
      {
        $set: { 
          contractId: new Types.ObjectId(), // Temporary placeholder - will update with real ID later
          _contractCreationInProgress: true
        }
      },
      { new: true }
    );

    // If update failed, it means another request already created a contract
    if (!updatedJob) {
      // Double-check what happened
      const currentJob = await this.jobModel.findById(job._id);
      if (currentJob?.contractId) {
        throw new BadRequestException('This job already has a contract. Only one contract is allowed per job.');
      }
      if (currentJob && currentJob.status !== JobStatus.IN_PROGRESS && currentJob.status !== JobStatus.AWAITING_CONTRACT) {
        throw new BadRequestException('Can only create contract for jobs awaiting contract or in-progress');
      }
      throw new BadRequestException('Failed to create contract due to concurrent modification. Please try again.');
    }

    // Check if a contract already exists for this proposal (additional safety check)
    const existingContract = await this.contractModel.findOne({ proposalId: contractData.proposalId });
    if (existingContract) {
      // Rollback the job update
      await this.jobModel.findByIdAndUpdate(job._id, { 
        $unset: { contractId: 1, _contractCreationInProgress: 1 } 
      });
      throw new BadRequestException('A contract already exists for this proposal');
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
    contract.status = ContractStatus.PENDING_PAYMENT; // Start with PENDING_PAYMENT status
    contract.platformFeePercentage = 10;
    contract.totalPaid = 0;
    contract.releasedAmount = 0;
    contract.milestoneCount = 0;
    contract.terms = contractData.terms || '';
    contract.isClientSigned = true;
    contract.isFreelancerSigned = false;

    // Save contract first - payment will be handled separately
    await contract.save();
    this.logger.log(`Contract created with PENDING_PAYMENT status: ${contract._id}`, 'ContractsService');

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

    // DON'T send notification to freelancer yet - wait until payment is complete
    // DON'T update job status yet - wait until payment is complete
    
    // Update job with the actual contract ID (replace the placeholder)
    await this.jobModel.findByIdAndUpdate(job._id, { 
      contractId: contract._id,
      $unset: { _contractCreationInProgress: 1 }
    });

    this.logger.log(`Contract created successfully with PENDING_PAYMENT status: ${contract._id}`, 'ContractsService');

    // Initiate payment if payment method provided
    let paymentIntentData: any = null;
    if (contractData.paymentMethodId) {
      try {
        const paymentResult = await this.initiateContractPayment(
          (contract._id as Types.ObjectId).toString(),
          contractData.paymentMethodId,
          clientId
        );
        paymentIntentData = paymentResult;
        this.logger.log(`Payment initiated for contract: ${contract._id}`, 'ContractsService');
      } catch (paymentError) {
        this.logger.error(`Failed to initiate payment for contract ${contract._id}: ${paymentError.message}`, paymentError.stack, 'ContractsService');
        // Don't fail contract creation if payment fails - client can retry payment later
      }
    }

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

    const contractObject = populatedContract.toObject() as any;
    
    // Add payment information to response
    contractObject.paymentIntent = paymentIntentData;
    contractObject.requiresPayment = !paymentIntentData; // Indicates if client needs to initiate payment
    return contractObject;
  } catch (error) {
    this.logger.error(`Failed to create contract: ${error.message}`, error.stack, 'ContractsService');
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000 || error.name === 'MongoServerError') {
      if (error.message?.includes('proposalId')) {
        throw new BadRequestException('A contract already exists for this proposal. Each proposal can only have one contract.');
      }
      if (error.message?.includes('jobId')) {
        throw new BadRequestException('This job already has an active contract. Only one active contract is allowed per job.');
      }
      throw new BadRequestException('A duplicate contract already exists. Please refresh and try again.');
    }
    
    throw error;
  }
}

  /**
   * Initiate payment for a contract
   * This can be called separately from contract creation to decouple concerns
   */
  async initiateContractPayment(
    contractId: string,
    paymentMethodId: string,
    clientId: string
  ): Promise<any> {
    try {
      // Get the contract
      const contract = await this.contractModel.findById(contractId);
      if (!contract) {
        throw new NotFoundException('Contract not found');
      }

      // Verify client owns the contract
      if (contract.clientId.toString() !== clientId) {
        throw new UnauthorizedException('You are not authorized to pay for this contract');
      }

      // Check contract status - should be PENDING_PAYMENT
      if (contract.status !== ContractStatus.PENDING_PAYMENT) {
        throw new BadRequestException(`Contract must be in PENDING_PAYMENT status. Current status: ${contract.status}`);
      }

      // Check if payment already initiated
      if (contract.stripePaymentIntentId) {
        // Check if existing payment is still pending
        const existingPayment = await this.paymentModel.findOne({
          stripePaymentIntentId: contract.stripePaymentIntentId,
          status: { $in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] }
        });

        if (existingPayment) {
          // Check if the payment was created more than 30 minutes ago (allow retry for stale payments)
          const paymentAge = Date.now() - (existingPayment as any).createdAt.getTime();
          const thirtyMinutes = 30 * 60 * 1000;

          if (paymentAge < thirtyMinutes) {
            throw new BadRequestException('A payment is already in progress for this contract. Please wait or contact support if this persists.');
          } else {
            // Allow retry for stale payments - cancel the old payment intent and proceed
            try {
              await this.stripeService.cancelPaymentIntent(contract.stripePaymentIntentId);
              this.logger.log(`Cancelled stale payment intent: ${contract.stripePaymentIntentId}`, 'ContractsService');

              // Update the old payment status to cancelled
              existingPayment.status = PaymentStatus.CANCELLED;
              await existingPayment.save();
            } catch (cancelError) {
              this.logger.warn(`Failed to cancel stale payment intent: ${cancelError.message}`, 'ContractsService');
              // Continue anyway - the new payment will create a new intent
            }
          }
        }
      }

      // Validate payment method
      const paymentMethod = await this.paymentMethodsService.findById(paymentMethodId);
      if (!paymentMethod || paymentMethod.userId.toString() !== clientId) {
        throw new BadRequestException('Payment method not found or does not belong to you');
      }

      const stripePaymentMethodId = paymentMethod.stripePaymentMethodId;

      // Get client's Stripe customer ID
      const client = await this.userModel.findById(clientId).exec();
      if (!client || !client.stripeCustomerId) {
        throw new BadRequestException('Client Stripe customer not found. Please ensure payment methods are properly set up.');
      }

      // Calculate platform fee and freelancer amount
      const platformFee = (contract.totalAmount * contract.platformFeePercentage) / 100;
      const freelancerAmount = contract.totalAmount - platformFee;

      // Create payment intent
      const paymentIntent = await this.stripeService.createPaymentIntent(
        contract.totalAmount,
        contract.currency,
        {
          contractId: contractId,
          type: 'contract_upfront',
          clientId: contract.clientId.toString(),
          freelancerId: contract.freelancerId.toString(),
          platformFeePercentage: contract.platformFeePercentage.toString(),
        },
        stripePaymentMethodId,
        client.stripeCustomerId
      );

      // Update contract with payment intent ID
      contract.stripePaymentIntentId = paymentIntent.id;
      await contract.save();

      this.logger.log(`Payment intent created for contract ${contractId}: ${paymentIntent.id}`, 'ContractsService');

      // Create Payment record in database
      const payment = new this.paymentModel({
        contractId: contract._id,
        milestoneId: null,
        payerId: contract.clientId,
        payeeId: contract.freelancerId,
        amount: contract.totalAmount,
        currency: contract.currency.toUpperCase(),
        paymentType: 'milestone',
        stripePaymentIntentId: paymentIntent.id,
        platformFee,
        platformFeePercentage: contract.platformFeePercentage,
        stripeFee: 0,
        freelancerAmount,
        status: PaymentStatus.PENDING,
        description: `Upfront payment for contract: ${contract.title}`,
        metadata: {
          type: 'contract_upfront',
          paymentMethodId: paymentMethodId,
          contractId: contractId,
          jobId: contract.jobId.toString(),
          proposalId: contract.proposalId.toString(),
        },
      });

      await payment.save();
      this.logger.log(`Payment record created: ${payment._id}`, 'ContractsService');

      // Create transaction log
      try {
        await this.transactionLogService.create({
          type: 'payment',
          fromUserId: contract.clientId,
          toUserId: contract.freelancerId,
          amount: contract.totalAmount,
          currency: contract.currency.toUpperCase(),
          fee: platformFee,
          netAmount: freelancerAmount,
          relatedId: contract._id as Types.ObjectId,
          relatedType: 'contract',
          stripeId: paymentIntent.id,
          description: `Upfront payment for contract: ${contract.title}`,
          metadata: {
            paymentId: (payment._id as Types.ObjectId).toString(),
            paymentType: 'milestone',
            platformFeePercentage: contract.platformFeePercentage,
            type: 'contract_upfront',
          },
        });
        this.logger.log(`Transaction log created for payment ${payment._id}`, 'ContractsService');
      } catch (logError) {
        this.logger.error(`Failed to create transaction log: ${logError.message}`, logError.stack, 'ContractsService');
        // Don't fail if transaction log fails
      }

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.clientSecret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        paymentId: (payment._id as Types.ObjectId).toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to initiate contract payment: ${error.message}`, error.stack, 'ContractsService');
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
    await this.invalidateContractCaches(contractId, contract.clientId.toString(), contract.freelancerId.toString());

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
    await this.invalidateContractCaches(contractId, contract.clientId.toString(), contract.freelancerId.toString());

    return result;
  }

  async getContractById(contractId: string, userId: string): Promise<Contract> {
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

    return sanitizedContract;
  }

  async getContractsForUser(userId: string, query: ContractQueryDto): Promise<PaginationResult<Contract>> {
    const { page = 1, limit = 10, status, contractType, clientId, freelancerId, jobId, search } = query;
    const skip = (page - 1) * limit;

    // Filter out PENDING_PAYMENT contracts from freelancer view
    const filter: any = {
      $or: [
        { clientId: userId }, // Clients see all their contracts
        { 
          freelancerId: userId,
          status: { $ne: ContractStatus.PENDING_PAYMENT } // Freelancers only see paid contracts
        }
      ],
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

    const contracts = contractDocs.map(contract => this.sanitizeContract(contract.toObject()));

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

    return result;
  }

  async completeContract(contractId: string, userId: string): Promise<Contract> {
    // Try to start a session for transaction (only works with replica sets)
    let session: ClientSession | null = null;
    let useTransaction = false;

    try {
      session = await this.contractModel.db.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch (error) {
      // Transactions not supported (standalone MongoDB), continue without transaction
      this.logger.warn('MongoDB transactions not supported, continuing without transaction');
      session = null;
      useTransaction = false;
    }

    try {
      const contractQuery = this.contractModel.findById(contractId);
      const contract = useTransaction 
        ? await contractQuery.session(session).exec()
        : await contractQuery.exec();
      
      if (!contract) {
        throw new NotFoundException('Contract not found');
      }

      if (contract.status !== ContractStatus.ACTIVE) {
        throw new BadRequestException(`Cannot complete contract with status: ${contract.status}`);
      }

      if (contract.clientId.toString() !== userId) {
        throw new UnauthorizedException('Unauthorized: Only the client can complete this contract');
      }

      const freelancerQuery = this.userModel.findById(contract.freelancerId);
      const freelancer = useTransaction 
        ? await freelancerQuery.session(session).exec()
        : await freelancerQuery.exec();

      if (!freelancer) {
        throw new NotFoundException('Associated user not found');
      }

      contract.status = ContractStatus.COMPLETED;
      contract.endDate = new Date();
      await contract.save(useTransaction ? { session } : {});

      if (freelancer.freelancerData) {
        freelancer.freelancerData.completedJobs = (freelancer.freelancerData.completedJobs || 0) + 1;
        await freelancer.save(useTransaction ? { session } : {});
      }

      if (useTransaction && session) {
        await session.commitTransaction();
      }

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
      await this.invalidateContractCaches(contractId, contract.clientId.toString(), contract.freelancerId.toString());

      return result;
    } catch (error) {
      if (useTransaction && session) {
        await session.abortTransaction();
      }
      this.logger.error(`Failed to complete contract ${contractId}: ${error.message}`, error.stack, 'ContractsService');
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
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

    // Clear cache after cancelling contract
    await this.invalidateContractCaches(contractId, contract.clientId.toString(), contract.freelancerId.toString());

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