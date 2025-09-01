import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Proposal, ProposalDocument } from '../schemas/proposal.schema';
import { SubmitProposalDto } from '../dto/submit-proposal.dto';
import { UpdateProposalDto } from '../dto/update-proposal.dto';
import { AcceptProposalDto } from '../dto/accept-proposal.dto';
import { RejectProposalDto } from '../dto/reject-proposal.dto';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Project, ProjectDocument } from '../../projects/schemas/project.schema';
import { EmailService } from '../../../common/services/email.service';
import { ContractsService } from '../../contracts/services/contracts.service';
import { CreateContractDto } from '../../contracts/dto/create-contract.dto';

@Injectable()
export class ProposalsService {
  constructor(
    @InjectModel(Proposal.name) private proposalModel: Model<ProposalDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private emailService: EmailService,
    private contractsService: ContractsService,
  ) {}

  async submitProposal(userId: string, projectId?: string, submitProposalDto?: SubmitProposalDto): Promise<Proposal> {
    // If projectId is not passed as parameter, get it from DTO
    const finalProjectId = projectId || submitProposalDto?.projectId;
    if (!finalProjectId) {
      throw new BadRequestException('Project ID is required');
    }

    if (!submitProposalDto) {
      throw new BadRequestException('Proposal data is required');
    }

    // Validate project exists and is open
    const project = await this.projectModel.findById(finalProjectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.status !== 'open') {
      throw new BadRequestException('Project is not accepting proposals');
    }

    // Check if user is a freelancer
    const user = await this.userModel.findById(userId);
    if (!user || !user.role.includes('freelancer')) {
      throw new ForbiddenException('Only freelancers can submit proposals');
    }

    // Check if freelancer already submitted a proposal for this project
    const existingProposal = await this.proposalModel.findOne({
      projectId: finalProjectId,
      freelancerId: userId,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingProposal) {
      throw new BadRequestException('You have already submitted a proposal for this project');
    }

    const proposal = new this.proposalModel({
      projectId: finalProjectId,
      freelancerId: userId,
      coverLetter: submitProposalDto.coverLetter,
      proposedBudget: submitProposalDto.proposedBudget || submitProposalDto.pricing.amount,
      proposedDuration: (submitProposalDto.proposedDuration && submitProposalDto.proposedDuration > 0) ? 
        (typeof submitProposalDto.proposedDuration === 'number' ? 
          { value: submitProposalDto.proposedDuration, unit: 'days' } : 
          submitProposalDto.proposedDuration) : 
        { value: submitProposalDto.timeline.deliveryTime, unit: 'days' },
      milestones: submitProposalDto.timeline.milestones,
      attachments: submitProposalDto.attachments?.map(att => ({
        name: att.description || 'Attachment',
        url: att.url,
        type: att.fileType
      })) || [],
      portfolioLinks: submitProposalDto.portfolioLinks || [],
      additionalInfo: submitProposalDto.additionalInfo,
      status: 'pending',
      submittedAt: new Date(),
    });

    const savedProposal = await proposal.save();

    // Update project proposal count
    await this.projectModel.findByIdAndUpdate(finalProjectId, {
      $inc: { proposalCount: 1 }
    });

    // Send notification email to client
    const client = await this.userModel.findById(project.clientId);
    if (client) {
      // TODO: Implement email notification for new proposal
      // await this.emailService.sendProposalNotification(
      //   client.email,
      //   project.title,
      //   user.firstName + ' ' + user.lastName
      // );
    }

    return savedProposal.populate(['freelancerId', 'projectId']);
  }

  async getUserProposals(userId: string, page: number = 1, limit: number = 10): Promise<{ proposals: Proposal[], total: number, page: number, limit: number }> {
    const skip = (page - 1) * limit;
    
    const [proposals, total] = await Promise.all([
      this.proposalModel
        .find({ freelancerId: userId })
        .populate({
          path: 'projectId',
          select: 'title description category subcategory status budget budgetType minBudget maxBudget duration deadline workType experienceLevel requiredSkills milestones contract payments createdAt updatedAt',
          populate: {
            path: 'clientId',
            select: 'firstName lastName email profilePicture phone location'
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.proposalModel.countDocuments({ freelancerId: userId })
    ]);

    return {
      proposals,
      total,
      page,
      limit
    };
  }  async getProposalById(proposalId: string, userId: string): Promise<Proposal> {
    const proposal = await this.proposalModel
      .findById(proposalId)
      .populate({
        path: 'projectId',
        select: 'title description category subcategory status budget budgetType minBudget maxBudget duration deadline workType experienceLevel requiredSkills milestones contract payments createdAt updatedAt',
        populate: {
          path: 'clientId',
          select: 'firstName lastName email profilePicture phone location'
        }
      });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Check if user has permission to view this proposal
    const project = proposal.projectId as any;
    if (proposal.freelancerId.toString() !== userId && project.clientId.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to view this proposal');
    }

    // Mark as viewed by client
    if (project.clientId.toString() === userId && !proposal.clientViewed) {
      proposal.clientViewed = true;
      proposal.clientViewedAt = new Date();
      await proposal.save();
    }

    return proposal;
  }

  async updateProposal(proposalId: string, userId: string, updateProposalDto: UpdateProposalDto): Promise<Proposal> {
    const proposal = await this.proposalModel.findById(proposalId);

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.freelancerId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own proposals');
    }

    if (proposal.status !== 'pending') {
      throw new BadRequestException('Cannot update a proposal that has been accepted or rejected');
    }

    Object.assign(proposal, updateProposalDto);
    return proposal.save();
  }

  async withdrawProposal(proposalId: string, userId: string): Promise<{ message: string }> {
    const proposal = await this.proposalModel.findById(proposalId);

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.freelancerId.toString() !== userId) {
      throw new ForbiddenException('You can only withdraw your own proposals');
    }

    if (proposal.status !== 'pending') {
      throw new BadRequestException('Cannot withdraw a proposal that has been accepted or rejected');
    }

    proposal.status = 'withdrawn';
    await proposal.save();

    // Update project proposal count
    await this.projectModel.findByIdAndUpdate(proposal.projectId, {
      $inc: { proposalCount: -1 }
    });

    return { message: 'Proposal withdrawn successfully' };
  }

  async getProposalsForProject(projectId: string, clientId: string): Promise<Proposal[]> {
    const project = await this.projectModel.findById(projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.clientId.toString() !== clientId) {
      throw new ForbiddenException('You can only view proposals for your own projects');
    }

    return this.proposalModel
      .find({ projectId })
      .populate('freelancerId', 'firstName lastName email profilePicture freelancerProfile.hourlyRate stats.avgRating')
      .sort({ createdAt: -1 });
  }

  async acceptProposal(proposalId: string, clientId: string, acceptProposalDto: AcceptProposalDto): Promise<{ message: string, contract: any }> {
    const proposal = await this.proposalModel.findById(proposalId).populate('projectId');

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const project = proposal.projectId as any;
    if (project.clientId.toString() !== clientId) {
      throw new ForbiddenException('You can only accept proposals for your own projects');
    }

    if (proposal.status !== 'pending') {
      throw new BadRequestException('Proposal has already been processed');
    }

    if (project.status !== 'open') {
      throw new BadRequestException('Project is not accepting proposals');
    }

    // Update proposal status
    proposal.status = 'accepted';
    await proposal.save();

    // Update project status and selected proposal
    await this.projectModel.findByIdAndUpdate(project._id, {
      status: 'in-progress',
      selectedProposal: proposalId
    });

    // Reject all other proposals for this project
    await this.proposalModel.updateMany(
      { projectId: project._id, _id: { $ne: proposalId }, status: 'pending' },
      { status: 'rejected' }
    );

    // Check if contract already exists for this proposal
    const contractExists = await this.contractsService.checkContractExistsForProposal(proposalId);
    if (contractExists) {
      // Get the existing contract
      const existingContract = await this.contractsService.getContractByProposalId(proposalId);
      return { 
        message: 'Proposal accepted successfully. Contract already exists for this proposal.', 
        contract: existingContract 
      };
    }

    // Create contract automatically using proposal data
    const contractDto: CreateContractDto = {
      projectId: project._id.toString(),
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

    const contract = await this.contractsService.createContract(contractDto);

    // Send notification to freelancer
    const freelancer = await this.userModel.findById(proposal.freelancerId);
    if (freelancer) {
      // TODO: Implement email notification for accepted proposal
      // await this.emailService.sendProposalAcceptedNotification(
      //   freelancer.email,
      //   project.title,
      //   acceptProposalDto.message
      // );
    }

    return { 
      message: 'Proposal accepted successfully. Contract created and awaiting client approval.', 
      contract: contract 
    };
  }

  async rejectProposal(proposalId: string, clientId: string, rejectProposalDto: RejectProposalDto): Promise<{ message: string }> {
    const proposal = await this.proposalModel.findById(proposalId).populate('projectId');

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const project = proposal.projectId as any;
    if (project.clientId.toString() !== clientId) {
      throw new ForbiddenException('You can only reject proposals for your own projects');
    }

    if (proposal.status !== 'pending') {
      throw new BadRequestException('Proposal has already been processed');
    }

    proposal.status = 'rejected';
    await proposal.save();

    // Update project proposal count
    await this.projectModel.findByIdAndUpdate(project._id, {
      $inc: { proposalCount: -1 }
    });

    // Send notification to freelancer
    const freelancer = await this.userModel.findById(proposal.freelancerId);
    if (freelancer) {
      // TODO: Implement email notification for rejected proposal
      // await this.emailService.sendProposalRejectedNotification(
      //   freelancer.email,
      //   project.title,
      //   rejectProposalDto.reason,
      //   rejectProposalDto.message
      // );
    }

    return { message: 'Proposal rejected successfully' };
  }

  async getClientProposals(clientId: string, page: number = 1, limit: number = 10): Promise<{ proposals: Proposal[], total: number, page: number, limit: number }> {
    const skip = (page - 1) * limit;

    // First, get all project IDs that belong to this client
    const clientProjects = await this.projectModel.find({ clientId }, '_id');
    const projectIds = clientProjects.map(project => project._id);

    const [proposals, total] = await Promise.all([
      this.proposalModel
        .find({ projectId: { $in: projectIds } })
        .populate({
          path: 'projectId',
          select: 'title description category subcategory status budget budgetType minBudget maxBudget duration deadline workType experienceLevel requiredSkills createdAt updatedAt'
        })
        .populate('freelancerId', 'firstName lastName email profilePicture freelancerProfile.hourlyRate stats.avgRating')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.proposalModel.countDocuments({ projectId: { $in: projectIds } })
    ]);

    return {
      proposals,
      total,
      page,
      limit
    };
  }
}
