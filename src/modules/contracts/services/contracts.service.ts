import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class ContractsService {
  constructor(
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Proposal.name) private proposalModel: Model<ProposalDocument>,
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
}
