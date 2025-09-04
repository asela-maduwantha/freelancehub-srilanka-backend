import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contract, ContractDocument } from '../../../schemas/contract.schema';
import { CreateContractDto } from '../dto/create-contract.dto';
import { UpdateMilestoneDto } from '../dto/update-milestone.dto';
import { SubmitMilestoneDto } from '../dto/submit-milestone.dto';
import { ApproveMilestoneDto } from '../dto/approve-milestone.dto';
import { RejectMilestoneDto } from '../dto/reject-milestone.dto';
import { CancelContractDto } from '../dto/cancel-contract.dto';
import { User, UserDocument } from '../../../schemas/user.schema';
import { Project, ProjectDocument } from '../../../schemas/project.schema';
import { Proposal, ProposalDocument } from '../../../schemas/proposal.schema';
import {
  FreelancerProfile,
  FreelancerProfileDocument,
} from '../../../schemas/freelancer-profile.schema';
import {
  ClientProfile,
  ClientProfileDocument,
} from '../../../schemas/client-profile.schema';
import { PdfService } from '../../../common/services/pdf.service';
import { EmailService } from '../../../common/services/email.service';

// Interface for enriched contract data
interface EnrichedContractData {
  contract: ContractDocument;
  client: UserDocument;
  clientProfile: ClientProfileDocument | null;
  freelancer: UserDocument;
  freelancerProfile: FreelancerProfileDocument | null;
  project: ProjectDocument | null;
  proposal: ProposalDocument;
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(ClientProfile.name)
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Proposal.name) private proposalModel: Model<ProposalDocument>,
    @InjectModel(FreelancerProfile.name)
    private freelancerProfileModel: Model<FreelancerProfileDocument>,
    @InjectModel(ClientProfile.name)
    private clientProfileModel: Model<ClientProfileDocument>,
    private pdfService: PdfService,
    private emailService: EmailService,
  ) {}

  async createContract(
    createContractDto: CreateContractDto,
    project?: any,
  ): Promise<Contract> {
    const { projectId, proposalId, terms, milestones } = createContractDto;

    // If project is not passed, find it
    if (!project) {
      console.log('Looking for project with ID:', projectId);
      project = await this.projectModel.findById(projectId);
      console.log('Found project:', project ? project._id : 'null');
      if (!project) {
        throw new NotFoundException('Project not found');
      }
    }

    const proposal = await this.proposalModel.findById(proposalId);
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Validate proposal is accepted
    if (proposal.status !== 'accepted') {
      throw new BadRequestException(
        'Proposal must be accepted before creating contract',
      );
    }

    // Create contract
    const contract = new this.contractModel({
      projectId: projectId,
      clientId: project.clientId,
      freelancerId: proposal.freelancerId,
      proposalId: proposalId,
      title: project.title,
      description: `Contract for project: ${project.title}`,
      totalAmount: terms.budget,
      contractType: terms.type === 'hourly' ? 'hourly' : 'fixed_price',
      terms: `Budget: $${terms.budget}, Type: ${terms.type}, Start Date: ${terms.startDate}, End Date: ${terms.endDate}, Payment Schedule: ${terms.paymentSchedule}`,
      milestones: milestones.map((milestone) => ({
        title: milestone.title,
        description: milestone.description,
        amount: milestone.amount,
        deadline: new Date(milestone.dueDate),
        status: 'pending' as const,
      })),
      startDate: new Date(terms.startDate),
      endDate: new Date(terms.endDate),
    });

    const savedContract = await contract.save();

    // Update project with contract ID
    await this.projectModel.findByIdAndUpdate(projectId, {
      contractId: savedContract._id,
    });

    const populatedContract = await this.contractModel
      .findById(savedContract._id)
      .populate(
        'projectId',
        'title description status budget deadline category skills client freelancer createdAt',
      )
      .populate(
        'clientId',
        'firstName lastName email profilePicture phoneNumber companyName rating reviewsCount',
      )
      .populate(
        'freelancerId',
        'firstName lastName email profilePicture phoneNumber companyName rating reviewsCount skills',
      )
      .populate(
        'proposalId',
        'proposedBudget proposedDuration coverLetter milestones attachments status createdAt',
      );

    return populatedContract!;
  }

  async createContractFromProposal(
    proposalId: string,
    client: string,
  ): Promise<{ message: string; contract: Contract }> {
    // Validate proposal exists and is accepted
    const proposal = await this.proposalModel.findById(proposalId);
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.status !== 'accepted') {
      throw new BadRequestException(
        'Proposal must be accepted before creating contract',
      );
    }

    // Validate project exists
    const project = await this.projectModel.findById(proposal.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Validate client has access to this proposal/project
    if (project.clientId.toString() !== client) {
      throw new ForbiddenException(
        'You do not have permission to create contract for this proposal',
      );
    }

    // Check if contract already exists for this proposal
    const existingContract = await this.contractModel.findOne({
      proposalId: proposalId,
    });
    if (existingContract) {
      throw new ConflictException('Contract already exists for this proposal');
    }

    // Create contract using proposal data
    const contractDto: CreateContractDto = {
      projectId: proposal.projectId.toString(),
      proposalId: proposalId,
      terms: {
        budget: proposal.proposedBudget.amount,
        type: 'fixed' as 'fixed' | 'hourly', // Default to fixed type since budgetType was removed
        startDate: new Date().toISOString().split('T')[0], // Today's date
        endDate: new Date(
          Date.now() +
            (proposal.proposedDuration?.value || 30) * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .split('T')[0], // Add duration days
        paymentSchedule: 'Upon milestone completion',
      },
      milestones:
        proposal.milestones?.map((milestone) => ({
          title: milestone.title,
          description: milestone.description,
          amount: milestone.amount,
          dueDate: milestone.deliveryDate.toISOString().split('T')[0],
        })) || [],
    };

    const contract = await this.createContract(contractDto);

    return {
      message: 'Contract created successfully from proposal',
      contract,
    };
  }

  async checkContractExistsForProposal(proposalId: string): Promise<boolean> {
    const existingContract = await this.contractModel.findOne({
      proposalId: proposalId,
    });
    return !!existingContract;
  }

  async getContractByProposalId(proposalId: string): Promise<Contract | null> {
    return this.contractModel
      .findOne({ proposalId: proposalId })
      .populate(
        'projectId',
        'title description status budget deadline category skills client freelancer createdAt',
      )
      .populate(
        'clientId',
        'firstName lastName email profilePicture phoneNumber companyName rating reviewsCount',
      )
      .populate(
        'freelancerId',
        'firstName lastName email profilePicture phoneNumber companyName rating reviewsCount skills',
      )
      .populate(
        'proposalId',
        'proposedBudget proposedDuration coverLetter milestones attachments status createdAt',
      );
  }

  async getUserContracts(userId: string): Promise<Contract[]> {
    return this.contractModel
      .find({
        $or: [{ clientId: userId }, { freelancerId: userId }],
      })
      .populate(
        'projectId',
        'title description status budget deadline category skills client freelancer createdAt',
      )
      .populate(
        'clientId',
        'firstName lastName email profilePicture phoneNumber companyName rating reviewsCount',
      )
      .populate(
        'freelancerId',
        'firstName lastName email profilePicture phoneNumber companyName rating reviewsCount skills',
      )
      .populate(
        'proposalId',
        'proposedBudget proposedDuration coverLetter milestones attachments status createdAt',
      )
      .sort({ createdAt: -1 });
  }

  async getContractsByProjectId(
    projectId: string,
    userId: string,
  ): Promise<Contract[]> {
    // First verify the user has access to this project
    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if user is the client for this project (freelancerId was removed from Project schema)
    if (project.clientId.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view contracts for this project',
      );
    }

    // Get all contracts for this project
    return this.contractModel
      .find({ projectId: projectId })
      .populate(
        'projectId',
        'title description status budget deadline category skills client freelancer createdAt',
      )
      .populate(
        'clientId',
        'firstName lastName email profilePicture phoneNumber companyName rating reviewsCount',
      )
      .populate(
        'freelancerId',
        'firstName lastName email profilePicture phoneNumber companyName rating reviewsCount skills',
      )
      .populate(
        'proposalId',
        'proposedBudget proposedDuration coverLetter milestones attachments status createdAt',
      )
      .sort({ createdAt: -1 });
  }

  async getContractById(contractId: string, userId: string): Promise<Contract> {
    const contract = await this.contractModel
      .findById(contractId)
      .populate(
        'projectId',
        'title description status budget deadline category skills client freelancer createdAt updatedAt',
      )
      .populate(
        'clientId',
        'firstName lastName email profilePicture phoneNumber companyName rating reviewsCount location bio',
      )
      .populate(
        'freelancerId',
        'firstName lastName email profilePicture phoneNumber companyName rating reviewsCount skills location bio',
      )
      .populate(
        'proposalId',
        'proposedBudget proposedDuration coverLetter milestones attachments status createdAt updatedAt',
      );

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Check if user has permission to view this contract
    if (
      contract.clientId._id.toString() !== userId &&
      contract.freelancerId._id.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this contract',
      );
    }

    return contract;
  }

  async updateMilestone(
    contractId: string,
    milestoneId: string,
    userId: string,
    updateMilestoneDto: UpdateMilestoneDto,
  ): Promise<Contract> {
    const contract = await this.contractModel.findById(contractId);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Only client can update milestones
    if (contract.clientId.toString() !== userId) {
      throw new ForbiddenException('Only the client can update milestones');
    }

    if (contract.status !== 'active') {
      throw new BadRequestException(
        'Cannot update milestones for inactive contracts',
      );
    }

    const milestone = contract.milestones.find(
      (m) => m._id.toString() === milestoneId,
    );
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    // Only allow updates for pending milestones
    if (milestone.status !== 'pending') {
      throw new BadRequestException(
        'Cannot update milestones that are already in progress or completed',
      );
    }

    Object.assign(milestone, updateMilestoneDto);
    return contract.save();
  }

  async submitMilestoneWork(
    contractId: string,
    milestoneId: string,
    userId: string,
    submitMilestoneDto: SubmitMilestoneDto,
  ): Promise<Contract> {
    const contract = await this.contractModel.findById(contractId);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Only freelancer can submit work
    if (contract.freelancerId.toString() !== userId) {
      throw new ForbiddenException(
        'Only the freelancer can submit milestone work',
      );
    }

    if (contract.status !== 'active') {
      throw new BadRequestException(
        'Cannot submit work for inactive contracts',
      );
    }
console.log("milestoneId:", contract.milestones)

    const milestone = contract.milestones.find(
      (m) => m._id.toString() === milestoneId,
    );
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.status !== 'in-progress') {
      throw new BadRequestException(
        'Milestone must be in progress to submit work',
      );
    }

    // Add submission to milestone (simplified since submissions property was removed)
    // Note: In clean schema, milestone submissions are handled differently
    milestone.status = 'submitted';

    return contract.save();
  }

  async approveMilestone(
    contractId: string,
    milestoneId: string,
    userId: string,
    approveMilestoneDto: ApproveMilestoneDto,
  ): Promise<Contract> {
    const contract = await this.contractModel.findById(contractId);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Only client can approve milestones
    if (contract.clientId.toString() !== userId) {
      throw new ForbiddenException('Only the client can approve milestones');
    }

    if (contract.status !== 'active') {
      throw new BadRequestException(
        'Cannot approve milestones for inactive contracts',
      );
    }

    const milestone = contract.milestones.find(
      (m) => m._id.toString() === milestoneId,
    );
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.status !== 'submitted') {
      throw new BadRequestException(
        'Milestone must be submitted to be approved',
      );
    }

    milestone.status = 'approved';
    // Note: totalPaid property was removed from clean Contract schema

    // Note: milestone submissions were removed from clean schema
    // Feedback would be handled differently in the new architecture

    // Check if all milestones are completed
    const allCompleted = contract.milestones.every(
      (m) => m.status === 'approved',
    );
    if (allCompleted) {
      contract.status = 'completed';
      // Note: completedAt property was removed from clean Contract schema
    }

    return contract.save();
  }

  async rejectMilestone(
    contractId: string,
    milestoneId: string,
    userId: string,
    rejectMilestoneDto: RejectMilestoneDto,
  ): Promise<Contract> {
    const contract = await this.contractModel.findById(contractId);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Only client can reject milestones
    if (contract.clientId.toString() !== userId) {
      throw new ForbiddenException('Only the client can reject milestones');
    }

    if (contract.status !== 'active') {
      throw new BadRequestException(
        'Cannot reject milestones for inactive contracts',
      );
    }

    const milestone = contract.milestones.find(
      (m) => m._id.toString() === milestoneId,
    );
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.status !== 'submitted') {
      throw new BadRequestException(
        'Milestone must be submitted to be rejected',
      );
    }

    milestone.status = 'rejected';

    // Note: milestone submissions and feedback were removed from clean schema

    return contract.save();
  }

  async completeContract(
    contractId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const contract = await this.contractModel.findById(contractId);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Only client can mark contract as complete
    if (contract.clientId.toString() !== userId) {
      throw new ForbiddenException('Only the client can complete the contract');
    }

    if (contract.status !== 'active') {
      throw new BadRequestException('Contract is not active');
    }

    // Check if all milestones are approved
    const allApproved = contract.milestones.every(
      (m) => m.status === 'approved',
    );
    if (!allApproved) {
      throw new BadRequestException(
        'All milestones must be approved before completing the contract',
      );
    }

    contract.status = 'completed';
    // Note: completedAt property was removed from clean Contract schema
    await contract.save();

    return { message: 'Contract completed successfully' };
  }

  async cancelContract(
    contractId: string,
    userId: string,
    cancelContractDto: CancelContractDto,
  ): Promise<{ message: string }> {
    const contract = await this.contractModel.findById(contractId);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Only client or freelancer can cancel
    if (
      contract.clientId.toString() !== userId &&
      contract.freelancerId.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to cancel this contract',
      );
    }

    if (contract.status !== 'active') {
      throw new BadRequestException('Contract is not active');
    }

    contract.status = 'cancelled';
    // Note: cancellationReason property was removed from clean Contract schema
    await contract.save();

    return { message: 'Contract cancelled successfully' };
  }


  async downloadContractPDF(
    contractId: string,
    userId: string,
  ): Promise<Buffer> {
    const contract = await this.contractModel.findById(contractId);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Check if user has permission
    if (
      contract.clientId.toString() !== userId &&
      contract.freelancerId.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to download this contract',
      );
    }

  

    // Generate PDF with enriched data
    const pdfBuffer = await this.pdfService.generateContractPDF(contract);
    return pdfBuffer;
  }

  async signContractByClient(contractId: string, userId: string) {
    const contract = await this.contractModel.findById(contractId);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.clientId.toString() !== userId) {
      throw new ForbiddenException('Only the client can sign this contract');
    }

    await this.contractModel.findByIdAndUpdate(contractId, {
      client_digital_signed: true,
    });

    return { message: 'Contract signed by client successfully' };
  }

  async signContractByFreelancer(contractId: string, userId: string) {
    const contract = await this.contractModel.findById(contractId);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.freelancerId.toString() !== userId) {
      throw new ForbiddenException('Only the freelancer can sign this contract');
    }

    await this.contractModel.findByIdAndUpdate(contractId, {
      freelancer_digital_signed: true,
    });

    return { message: 'Contract signed by freelancer successfully' };
  }
}
