import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contract, ContractDocument } from '../schemas/contract.schema';
import { CreateContractDto } from '../dto/create-contract.dto';
import { UpdateMilestoneDto } from '../dto/update-milestone.dto';
import { SubmitMilestoneDto } from '../dto/submit-milestone.dto';
import { ApproveMilestoneDto } from '../dto/approve-milestone.dto';
import { RejectMilestoneDto } from '../dto/reject-milestone.dto';
import { CancelContractDto } from '../dto/cancel-contract.dto';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Project, ProjectDocument } from '../../projects/schemas/project.schema';
import { Proposal, ProposalDocument } from '../../proposals/schemas/proposal.schema';
import { PdfService } from '../../../common/services/pdf.service';
import { EmailService } from '../../../common/services/email.service';

@Injectable()
export class ContractsService {
  constructor(
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Proposal.name) private proposalModel: Model<ProposalDocument>,
    private pdfService: PdfService,
    private emailService: EmailService,
  ) {}

  async createContract(createContractDto: CreateContractDto): Promise<Contract> {
    const { projectId, proposalId, terms, milestones } = createContractDto;

    // Validate project and proposal exist
    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const proposal = await this.proposalModel.findById(proposalId);
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Validate proposal is accepted
    if (proposal.status !== 'accepted') {
      throw new BadRequestException('Proposal must be accepted before creating contract');
    }

    // Create contract
    const contract = new this.contractModel({
      projectId,
      clientId: project.clientId,
      freelancerId: proposal.freelancerId,
      proposalId,
      terms,
      milestones: milestones.map(milestone => ({
        ...milestone,
        status: 'pending' as const,
        submissions: []
      })),
    });

    const savedContract = await contract.save();

    // Update project with contract ID
    await this.projectModel.findByIdAndUpdate(projectId, {
      contractId: savedContract._id
    });

    return savedContract.populate(['projectId', 'clientId', 'freelancerId', 'proposalId']);
  }

  async createContractFromProposal(proposalId: string, clientId: string): Promise<{ message: string, contract: Contract }> {
    // Validate proposal exists and is accepted
    const proposal = await this.proposalModel.findById(proposalId);
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.status !== 'accepted') {
      throw new BadRequestException('Proposal must be accepted before creating contract');
    }

    // Validate project exists
    const project = await this.projectModel.findById(proposal.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Validate client has access to this proposal/project
    if (project.clientId.toString() !== clientId) {
      throw new ForbiddenException('You do not have permission to create contract for this proposal');
    }

    // Check if contract already exists for this proposal
    const existingContract = await this.contractModel.findOne({ proposalId });
    if (existingContract) {
      throw new ConflictException('Contract already exists for this proposal');
    }

    // Create contract using proposal data
    const contractDto: CreateContractDto = {
      projectId: proposal.projectId.toString(),
      proposalId: proposalId,
      terms: {
        budget: proposal.proposedBudget,
        type: (project.budgetType === 'hourly' ? 'hourly' : 'fixed') as 'fixed' | 'hourly',
        startDate: new Date().toISOString().split('T')[0], // Today's date
        endDate: new Date(Date.now() + (proposal.proposedDuration.value * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // Add duration days
        paymentSchedule: 'Upon milestone completion'
      },
      milestones: proposal.milestones?.map(milestone => ({
        title: milestone.title,
        description: milestone.description,
        amount: milestone.amount,
        dueDate: milestone.deliveryDate.toISOString().split('T')[0]
      })) || []
    };

    const contract = await this.createContract(contractDto);

    return { 
      message: 'Contract created successfully from proposal', 
      contract 
    };
  }

  async checkContractExistsForProposal(proposalId: string): Promise<boolean> {
    const existingContract = await this.contractModel.findOne({ proposalId });
    return !!existingContract;
  }

  async getContractByProposalId(proposalId: string): Promise<Contract | null> {
    return this.contractModel.findOne({ proposalId }).populate(['projectId', 'clientId', 'freelancerId', 'proposalId']);
  }

  async getUserContracts(userId: string): Promise<Contract[]> {
    return this.contractModel
      .find({
        $or: [{ clientId: userId }, { freelancerId: userId }]
      })
      .populate('projectId', 'title status budget deadline')
      .populate('clientId', 'firstName lastName email')
      .populate('freelancerId', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }

  async getContractsByProjectId(projectId: string, userId: string): Promise<Contract[]> {
    // First verify the user has access to this project
    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if user is the client or freelancer of the project
    if (project.clientId.toString() !== userId && project.freelancerId?.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to view contracts for this project');
    }

    // Get all contracts for this project
    return this.contractModel
      .find({ projectId })
      .populate('projectId', 'title status budget deadline')
      .populate('clientId', 'firstName lastName email')
      .populate('freelancerId', 'firstName lastName email')
      .populate('proposalId', 'proposedBudget milestones')
      .sort({ createdAt: -1 });
  }

  async getContractById(contractId: string, userId: string): Promise<Contract> {
    const contract = await this.contractModel
      .findById(contractId)
      .populate('projectId')
      .populate('clientId', 'firstName lastName email profilePicture')
      .populate('freelancerId', 'firstName lastName email profilePicture')
      .populate('proposalId', 'proposedBudget milestones');

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Check if user has permission to view this contract
    if (contract.clientId._id.toString() !== userId && contract.freelancerId._id.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to view this contract');
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
      throw new BadRequestException('Cannot update milestones for inactive contracts');
    }

    const milestone = contract.milestones.find(m => m._id.toString() === milestoneId);
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    // Only allow updates for pending milestones
    if (milestone.status !== 'pending') {
      throw new BadRequestException('Cannot update milestones that are already in progress or completed');
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
      throw new ForbiddenException('Only the freelancer can submit milestone work');
    }

    if (contract.status !== 'active') {
      throw new BadRequestException('Cannot submit work for inactive contracts');
    }

    const milestone = contract.milestones.find(m => m._id.toString() === milestoneId);
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.status !== 'in-progress') {
      throw new BadRequestException('Milestone must be in progress to submit work');
    }

    // Add submission to milestone
    milestone.submissions.push({
      files: submitMilestoneDto.files || [],
      description: submitMilestoneDto.description,
      submittedAt: new Date(),
      feedback: ''
    });

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
      throw new BadRequestException('Cannot approve milestones for inactive contracts');
    }

    const milestone = contract.milestones.find(m => m._id.toString() === milestoneId);
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.status !== 'submitted') {
      throw new BadRequestException('Milestone must be submitted to be approved');
    }

    milestone.status = 'approved';
    contract.totalPaid += milestone.amount;

    // Update latest submission with feedback
    if (milestone.submissions.length > 0) {
      milestone.submissions[milestone.submissions.length - 1].feedback = approveMilestoneDto.feedback || 'Approved';
    }

    // Check if all milestones are completed
    const allCompleted = contract.milestones.every(m => m.status === 'approved');
    if (allCompleted) {
      contract.status = 'completed';
      contract.completedAt = new Date();
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
      throw new BadRequestException('Cannot reject milestones for inactive contracts');
    }

    const milestone = contract.milestones.find(m => m._id.toString() === milestoneId);
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.status !== 'submitted') {
      throw new BadRequestException('Milestone must be submitted to be rejected');
    }

    milestone.status = 'rejected';

    // Update latest submission with feedback
    if (milestone.submissions.length > 0) {
      milestone.submissions[milestone.submissions.length - 1].feedback = rejectMilestoneDto.feedback;
    }

    return contract.save();
  }

  async completeContract(contractId: string, userId: string): Promise<{ message: string }> {
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
    const allApproved = contract.milestones.every(m => m.status === 'approved');
    if (!allApproved) {
      throw new BadRequestException('All milestones must be approved before completing the contract');
    }

    contract.status = 'completed';
    contract.completedAt = new Date();
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
    if (contract.clientId.toString() !== userId && contract.freelancerId.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to cancel this contract');
    }

    if (contract.status !== 'active') {
      throw new BadRequestException('Contract is not active');
    }

    contract.status = 'cancelled';
    contract.cancellationReason = cancelContractDto.reason;
    await contract.save();

    return { message: 'Contract cancelled successfully' };
  }

  async approveContractByClient(contractId: string, clientId: string): Promise<{ message: string, contract: Contract }> {
    const contract = await this.contractModel.findById(contractId);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.clientId.toString() !== clientId) {
      throw new ForbiddenException('Only the client can approve this contract');
    }

    if (contract.approvalWorkflow.clientApproved) {
      throw new BadRequestException('Contract already approved by client');
    }

    contract.approvalWorkflow.clientApproved = true;
    contract.approvalWorkflow.clientApprovedAt = new Date();

    const updatedContract = await contract.save();

    // If both parties have approved, generate PDF and send emails
    if (updatedContract.approvalWorkflow.freelancerApproved) {
      await this.generateAndSendContractPDF(updatedContract);
    } else {
      // Send notification to freelancer that contract is ready for approval
      const freelancer = await this.userModel.findById(updatedContract.freelancerId);
      const project = await this.projectModel.findById(updatedContract.projectId);
      if (freelancer && project) {
        await this.emailService.sendContractReadyForApproval(
          freelancer.email,
          (updatedContract as any)._id.toString(),
          project.title,
          true
        );
      }
    }

    return { 
      message: 'Contract approved by client successfully', 
      contract: updatedContract 
    };
  }

  async approveContractByFreelancer(contractId: string, freelancerId: string): Promise<{ message: string, contract: Contract }> {
    const contract = await this.contractModel.findById(contractId);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.freelancerId.toString() !== freelancerId) {
      throw new ForbiddenException('Only the freelancer can approve this contract');
    }

    if (contract.approvalWorkflow.freelancerApproved) {
      throw new BadRequestException('Contract already approved by freelancer');
    }

    // Check if client has approved first (client_first approval order)
    if (contract.approvalWorkflow.approvalOrder === 'client_first' && !contract.approvalWorkflow.clientApproved) {
      throw new BadRequestException('Client must approve the contract first');
    }

    contract.approvalWorkflow.freelancerApproved = true;
    contract.approvalWorkflow.freelancerApprovedAt = new Date();

    const updatedContract = await contract.save();

    // If both parties have approved, generate PDF and send emails
    if (updatedContract.approvalWorkflow.clientApproved) {
      await this.generateAndSendContractPDF(updatedContract);
    }

    return { 
      message: 'Contract approved by freelancer successfully', 
      contract: updatedContract 
    };
  }

  async getContractForFreelancer(contractId: string, freelancerId: string): Promise<Contract | null> {
    const contract = await this.contractModel.findById(contractId);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.freelancerId.toString() !== freelancerId) {
      throw new ForbiddenException('You do not have permission to view this contract');
    }

    // Freelancer can only see contract after client has approved it
    if (!contract.approvalWorkflow.clientApproved) {
      return null; // Contract not yet visible to freelancer
    }

    return contract.populate(['projectId', 'clientId', 'freelancerId', 'proposalId']);
  }

  private async generateAndSendContractPDF(contract: ContractDocument): Promise<void> {
    try {
      // Generate PDF
      const pdfBuffer = await this.pdfService.generateContractPDF(contract);
      
      // Save PDF to file
      const filename = `contract-${contract._id}.pdf`;
      const filePath = await this.pdfService.savePDFToFile(pdfBuffer, filename);
      
      // Update contract with PDF URL
      contract.pdfUrl = `https://api.yourapp.com/contracts/${contract._id}/pdf`;
      await contract.save();

      // Get project details for email
      const project = await this.projectModel.findById(contract.projectId);
      const projectTitle = project?.title || 'Project';

      // Send emails to both parties
      const client = await this.userModel.findById(contract.clientId);
      const freelancer = await this.userModel.findById(contract.freelancerId);

      if (client) {
        await this.emailService.sendContractPDF(
          client.email,
          (contract as any)._id.toString(),
          pdfBuffer,
          projectTitle
        );
      }

      if (freelancer) {
        await this.emailService.sendContractPDF(
          freelancer.email,
          (contract as any)._id.toString(),
          pdfBuffer,
          projectTitle
        );
      }
    } catch (error) {
      console.error('Error generating/sending contract PDF:', error);
      // Don't throw error to avoid breaking the approval flow
    }
  }

  async downloadContractPDF(contractId: string, userId: string): Promise<string> {
    const contract = await this.contractModel.findById(contractId);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Check if user has permission
    if (contract.clientId.toString() !== userId && contract.freelancerId.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to download this contract');
    }

    // Check if contract is fully approved
    if (!contract.approvalWorkflow.clientApproved || !contract.approvalWorkflow.freelancerApproved) {
      throw new BadRequestException('Contract must be approved by both parties before downloading PDF');
    }

    if (!contract.pdfUrl) {
      throw new BadRequestException('PDF not available for this contract');
    }

    return contract.pdfUrl;
  }
}
