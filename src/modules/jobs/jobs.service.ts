// src/modules/jobs/jobs.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from '../../database/schemas/job.schema';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import {
  JobResponseDto,
  JobsListResponseDto,
  MessageResponseDto,
  ClientResponseDto,
  BudgetResponseDto,
  DurationResponseDto,
  AttachmentResponseDto,
  JobLocationResponseDto,
} from './dto/job-response.dto';
import { JobStatus } from '../../common/enums/job-status.enum';
import { RESPONSE_MESSAGES } from '../../common/constants/response-messages';
import { ProposalsService } from '../proposals/proposals.service';
import { SavedJob } from '../../database/schemas/saved-job.schema';
import { JobReport, ReportReason } from '../../database/schemas/job-report.schema';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<Job>,
    private readonly proposalsService: ProposalsService,
    @InjectModel(SavedJob.name) private readonly savedJobModel: Model<SavedJob>,
    @InjectModel(JobReport.name) private readonly jobReportModel: Model<JobReport>,
  ) {}

  // Create a new job
  async create(
    createJobDto: CreateJobDto,
    clientId: string,
  ): Promise<JobResponseDto> {
    const job = new this.jobModel({
      ...createJobDto,
      clientId,
      status: JobStatus.DRAFT,
      postedAt: new Date(),
    });

    const savedJob = await job.save();
    // Convert to plain object and populate client data
    const populatedJob = await this.jobModel
      .findById(savedJob._id)
      .populate('clientId', 'email profile.firstName profile.lastName')
      .lean()
      .exec();

    return this.mapToJobResponseDto(populatedJob);
  }

  // Get all jobs with pagination and filtering
  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: JobStatus,
    category?: string,
    clientId?: string,
    search?: string,
  ): Promise<JobsListResponseDto> {
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (clientId) filter.clientId = clientId;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { skills: { $regex: search, $options: 'i' } },
      ];
    }

    const [jobs, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .populate('clientId', 'email profile.firstName profile.lastName')
        .lean()
        .sort({ postedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      jobs: jobs.map((job) => this.mapToJobResponseDto(job)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Get a job by ID
  async findOne(id: string, clientId?: string): Promise<JobResponseDto> {
    const job = await this.jobModel
      .findById(id)
      .populate('clientId', 'email profile.firstName profile.lastName')
      .lean()
      .exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    if (job.deletedAt) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    // If job is not active and requester is not the owner, don't show
    if (job.status !== JobStatus.OPEN && job.clientId?._id?.toString() !== clientId) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    return this.mapToJobResponseDto(job);
  }

  // Update a job
  async update(
    id: string,
    updateJobDto: UpdateJobDto,
    clientId: string,
  ): Promise<JobResponseDto> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    // Check if user is the owner
    if (job.clientId.toString() !== clientId) {
      throw new ForbiddenException(RESPONSE_MESSAGES.JOB.UNAUTHORIZED);
    }

    // Check if job can be modified
    if (job.status !== JobStatus.DRAFT && job.status !== JobStatus.OPEN) {
      throw new BadRequestException(RESPONSE_MESSAGES.JOB.CANNOT_MODIFY);
    }

    // Update job - only update provided fields
    const updateData: any = {};
    
    // Helper function to add to updateData if value is not undefined
    const addIfDefined = (key: string, value: any) => {
      if (value !== undefined) {
        updateData[key] = value;
      }
    };

    // Add simple fields
    addIfDefined('title', updateJobDto.title);
    addIfDefined('description', updateJobDto.description);
    addIfDefined('category', updateJobDto.category);
    addIfDefined('subcategory', updateJobDto.subcategory);
    addIfDefined('projectType', updateJobDto.projectType);
    addIfDefined('skills', updateJobDto.skills);
    addIfDefined('experienceLevel', updateJobDto.experienceLevel);
    addIfDefined('isUrgent', updateJobDto.isUrgent);
    addIfDefined('isFeatured', updateJobDto.isFeatured);
    addIfDefined('attachments', updateJobDto.attachments);
    addIfDefined('maxProposals', updateJobDto.maxProposals);
    addIfDefined('expiresAt', updateJobDto.expiresAt);

    // Handle budget subdocument - only update if all required fields are provided
    if (updateJobDto.budget !== undefined) {
      if (updateJobDto.budget.type !== undefined && updateJobDto.budget.min !== undefined) {
        updateData.budget = updateJobDto.budget;
      } else {
        // Update individual budget fields
        if (updateJobDto.budget.type !== undefined) {
          updateData['budget.type'] = updateJobDto.budget.type;
        }
        if (updateJobDto.budget.min !== undefined) {
          updateData['budget.min'] = updateJobDto.budget.min;
        }
        if (updateJobDto.budget.max !== undefined) {
          updateData['budget.max'] = updateJobDto.budget.max;
        }
        if (updateJobDto.budget.currency !== undefined) {
          updateData['budget.currency'] = updateJobDto.budget.currency;
        }
      }
    }

    // Handle duration subdocument - only update if all required fields are provided
    if (updateJobDto.duration !== undefined) {
      if (updateJobDto.duration.type !== undefined) {
        updateData.duration = updateJobDto.duration;
      } else {
        // Update individual duration fields
        if (updateJobDto.duration.estimatedHours !== undefined) {
          updateData['duration.estimatedHours'] = updateJobDto.duration.estimatedHours;
        }
      }
    }

    // Handle location subdocument - only update if all required fields are provided
    if (updateJobDto.location !== undefined) {
      if (updateJobDto.location.type !== undefined) {
        updateData.location = updateJobDto.location;
      } else {
        // Update individual location fields
        if (updateJobDto.location.countries !== undefined) {
          updateData['location.countries'] = updateJobDto.location.countries;
        }
        if (updateJobDto.location.timezone !== undefined) {
          updateData['location.timezone'] = updateJobDto.location.timezone;
        }
      }
    }

    // Update the job using findByIdAndUpdate with $set
    const updatedJob = await this.jobModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
      .populate('clientId', 'email profile.firstName profile.lastName')
      .exec();

    if (!updatedJob) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    return this.mapToJobResponseDto(updatedJob);
  }

  // Delete a job
  async remove(id: string, clientId: string): Promise<MessageResponseDto> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    // Check if user is the owner
    if (job.clientId.toString() !== clientId) {
      throw new ForbiddenException(RESPONSE_MESSAGES.JOB.UNAUTHORIZED);
    }

    // Check if job can be deleted
    if (job.status !== JobStatus.DRAFT && job.status !== JobStatus.CANCELLED) {
      throw new BadRequestException(RESPONSE_MESSAGES.JOB.CANNOT_MODIFY);
    }

    await this.jobModel.findByIdAndDelete(id).exec();

    return { message: RESPONSE_MESSAGES.JOB.DELETED };
  }

  // Get all jobs posted by current client
  async findMyJobs(
    page: number = 1,
    limit: number = 10,
    clientId: string,
    status?: JobStatus,
  ): Promise<JobsListResponseDto> {
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = { clientId };
    if (status) filter.status = status;

    const [jobs, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .populate('clientId', 'email profile.firstName profile.lastName')
        .lean()
        .sort({ postedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      jobs: jobs.map((job) => this.mapToJobResponseDto(job)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Close job to new proposals
  async closeJob(id: string, clientId: string): Promise<MessageResponseDto> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    // Check if user is the owner
    if (job.clientId.toString() !== clientId) {
      throw new ForbiddenException(RESPONSE_MESSAGES.JOB.UNAUTHORIZED);
    }

    // Check if job can be closed
    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException('Job is not open and cannot be closed');
    }

    // Update job status to completed (since it's closed to new proposals)
    await this.jobModel.findByIdAndUpdate(id, { status: JobStatus.COMPLETED }).exec();

    return { message: 'Job closed successfully' };
  }

  // Reopen job for proposals
  async reopenJob(id: string, clientId: string): Promise<MessageResponseDto> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    // Check if user is the owner
    if (job.clientId.toString() !== clientId) {
      throw new ForbiddenException(RESPONSE_MESSAGES.JOB.UNAUTHORIZED);
    }

    // Check if job can be reopened
    if (job.status !== JobStatus.COMPLETED) {
      throw new BadRequestException('Only completed jobs can be reopened');
    }

    // Update job status back to open
    await this.jobModel.findByIdAndUpdate(id, { status: JobStatus.OPEN }).exec();

    return { message: 'Job reopened successfully' };
  }

  // Get featured jobs
  async findFeaturedJobs(
    page: number = 1,
    limit: number = 10,
  ): Promise<JobsListResponseDto> {
    const skip = (page - 1) * limit;

    const filter = { 
      status: JobStatus.OPEN,
      isFeatured: true,
      deletedAt: { $exists: false }
    };

    const [jobs, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .populate('clientId', 'email profile.firstName profile.lastName')
        .lean()
        .sort({ postedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      jobs: jobs.map((job) => this.mapToJobResponseDto(job)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Get recent jobs
  async findRecentJobs(
    page: number = 1,
    limit: number = 10,
    days: number = 7,
  ): Promise<JobsListResponseDto> {
    const skip = (page - 1) * limit;
    
    // Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const filter = { 
      status: JobStatus.OPEN,
      postedAt: { $gte: dateThreshold },
      deletedAt: { $exists: false }
    };

    const [jobs, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .populate('clientId', 'email profile.firstName profile.lastName')
        .lean()
        .sort({ postedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      jobs: jobs.map((job) => this.mapToJobResponseDto(job)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Get jobs by category
  async findJobsByCategory(
    category: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<JobsListResponseDto> {
    const skip = (page - 1) * limit;

    const filter = { 
      status: JobStatus.OPEN,
      category: { $regex: new RegExp(category, 'i') },
      deletedAt: { $exists: false }
    };

    const [jobs, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .populate('clientId', 'email profile.firstName profile.lastName')
        .lean()
        .sort({ postedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      jobs: jobs.map((job) => this.mapToJobResponseDto(job)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Get recommended jobs for freelancer
  async findRecommendedJobs(
    freelancerId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<JobsListResponseDto> {
    const skip = (page - 1) * limit;

    // Get freelancer's skills (this would need to be injected or accessed differently)
    // For now, we'll implement a basic version that prioritizes jobs based on skills matching
    // In a real implementation, you'd want to get the freelancer's profile and skills
    
    const filter = { 
      status: JobStatus.OPEN,
      deletedAt: { $exists: false }
    };

    // For now, just return recent jobs as "recommended"
    // In a full implementation, you'd match against freelancer's skills
    const [jobs, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .populate('clientId', 'email profile.firstName profile.lastName')
        .lean()
        .sort({ postedAt: -1, isUrgent: -1, isFeatured: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      jobs: jobs.map((job) => this.mapToJobResponseDto(job)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Get job statistics
  async getJobStats(id: string, userId: string) {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    // Check if user is the owner or an admin
    if (job.clientId.toString() !== userId) {
      // In a real implementation, you'd check if user is admin
      throw new ForbiddenException('Only job owner can view statistics');
    }

    // Calculate some basic stats
    const daysPosted = Math.floor((Date.now() - job.postedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      jobId: id,
      views: 0, // Would need a separate tracking system
      proposalCount: job.proposalCount || 0,
      daysPosted,
      status: job.status,
      isActive: job.status === JobStatus.OPEN && !job.deletedAt,
      isExpired: job.expiresAt ? new Date() > job.expiresAt : false,
    };
  }

  // Get job proposals
  async getJobProposals(id: string, clientId: string, page: number = 1, limit: number = 10) {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    // Check if user is the owner
    if (job.clientId.toString() !== clientId) {
      throw new ForbiddenException('Only job owner can view proposals');
    }

    return this.proposalsService.findByJobId(id, clientId, page, limit);
  }

  // Save job to favorites
  async saveJob(id: string, freelancerId: string): Promise<MessageResponseDto> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    // Check if job is already saved
    const existingSavedJob = await this.savedJobModel.findOne({
      jobId: id,
      freelancerId,
    }).exec();

    if (existingSavedJob) {
      throw new BadRequestException('Job is already saved');
    }

    // Save the job
    const savedJob = new this.savedJobModel({
      jobId: id,
      freelancerId,
    });

    await savedJob.save();

    return { message: 'Job saved successfully' };
  }

  // Remove job from favorites
  async unsaveJob(id: string, freelancerId: string): Promise<MessageResponseDto> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    // Check if job is saved
    const savedJob = await this.savedJobModel.findOne({
      jobId: id,
      freelancerId,
    }).exec();

    if (!savedJob) {
      throw new NotFoundException('Job is not saved');
    }

    // Remove from saved jobs
    await this.savedJobModel.findByIdAndDelete(savedJob._id).exec();

    return { message: 'Job removed from favorites successfully' };
  }

  // Get saved jobs for freelancer
  async getSavedJobs(
    freelancerId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<JobsListResponseDto> {
    const skip = (page - 1) * limit;

    const [savedJobs, total] = await Promise.all([
      this.savedJobModel
        .find({ freelancerId })
        .populate({
          path: 'jobId',
          populate: {
            path: 'clientId',
            select: 'email profile.firstName profile.lastName',
          },
        })
        .sort({ savedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.savedJobModel.countDocuments({ freelancerId }).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Extract job data from populated saved jobs
    const jobs = savedJobs
      .filter((savedJob: any) => savedJob.jobId) // Filter out jobs that might have been deleted
      .map((savedJob: any) => this.mapToJobResponseDto(savedJob.jobId));

    return {
      jobs,
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Report inappropriate job
  async reportJob(
    id: string,
    reporterId: string,
    reportData: { reason: string; description?: string },
  ): Promise<MessageResponseDto> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    // Validate report reason
    if (!Object.values(ReportReason).includes(reportData.reason as ReportReason)) {
      throw new BadRequestException('Invalid report reason');
    }

    // Check if job is already reported by this user
    const existingReport = await this.jobReportModel.findOne({
      jobId: id,
      reporterId,
    }).exec();

    if (existingReport) {
      throw new BadRequestException('You have already reported this job');
    }

    // Create the report
    const report = new this.jobReportModel({
      jobId: id,
      reporterId,
      reason: reportData.reason,
      description: reportData.description,
    });

    await report.save();

    return { message: 'Job reported successfully' };
  }

  // Map job document to response DTO
  private mapToJobResponseDto(job: any): JobResponseDto {
    const client = job.clientId;
    const clientProfile = client?.profile || {};

    // Compute virtual fields directly to avoid serialization issues
    const isActive = job.status === JobStatus.OPEN && !job.deletedAt;
    const isExpired = job.expiresAt ? new Date() > new Date(job.expiresAt) : false;
    const canReceiveProposals = isActive && !isExpired && (!job.maxProposals || job.proposalCount < job.maxProposals);

    // Create client DTO with explicit property assignment
    const clientDto = new ClientResponseDto();
    clientDto.id = client?._id?.toString() || '';
    clientDto.email = client?.email || '';
    clientDto.fullName = client
      ? `${clientProfile.firstName || ''} ${clientProfile.lastName || ''}`.trim()
      : '';
    clientDto.avatar = clientProfile.avatar;

    // Create budget DTO with explicit property assignment
    const budgetDto = new BudgetResponseDto();
    if (job.budget) {
      budgetDto.type = job.budget.type;
      budgetDto.min = job.budget.min;
      budgetDto.max = job.budget.max;
      budgetDto.currency = job.budget.currency || 'USD';
    }

    // Create duration DTO if exists with explicit property assignment
    let durationDto: DurationResponseDto | undefined;
    if (job.duration) {
      durationDto = new DurationResponseDto();
      durationDto.type = job.duration.type;
      durationDto.estimatedHours = job.duration.estimatedHours;
    }

    // Create location DTO if exists with explicit property assignment
    let locationDto: JobLocationResponseDto | undefined;
    if (job.location) {
      locationDto = new JobLocationResponseDto();
      locationDto.type = job.location.type;
      locationDto.countries = job.location.countries ? [...job.location.countries] : undefined;
      locationDto.timezone = job.location.timezone;
    }

    // Create attachments DTOs with explicit property assignment
    const attachments = (job.attachments || []).map((attachment: any) => {
      const attachmentDto = new AttachmentResponseDto();
      attachmentDto.filename = attachment.filename;
      attachmentDto.url = attachment.url;
      attachmentDto.size = attachment.size;
      attachmentDto.type = attachment.type;
      return attachmentDto;
    });

    // Create main job DTO with explicit property assignment
    const jobDto = new JobResponseDto();
    jobDto.id = job._id.toString();
    jobDto.client = clientDto;
    jobDto.title = job.title;
    jobDto.description = job.description;
    jobDto.category = job.category;
    jobDto.subcategory = job.subcategory;
    jobDto.projectType = job.projectType;
    jobDto.budget = budgetDto;
    jobDto.duration = durationDto;
    jobDto.skills = Array.isArray(job.skills) ? [...job.skills] : [];
    jobDto.experienceLevel = job.experienceLevel;
    jobDto.status = job.status;
    jobDto.isUrgent = Boolean(job.isUrgent);
    jobDto.isFeatured = Boolean(job.isFeatured);
    jobDto.attachments = attachments;
    jobDto.location = locationDto;
    jobDto.proposalCount = job.proposalCount || 0;
    jobDto.maxProposals = job.maxProposals;
    jobDto.selectedProposalId = job.selectedProposalId?.toString();
    jobDto.contractId = job.contractId?.toString();
    jobDto.postedAt = job.postedAt;
    jobDto.expiresAt = job.expiresAt;
    jobDto.completedAt = job.completedAt;
    jobDto.createdAt = job.createdAt;
    jobDto.updatedAt = job.updatedAt;
    jobDto.isActive = isActive;
    jobDto.isExpired = isExpired;
    jobDto.canReceiveProposals = canReceiveProposals;

    return jobDto;
  }
}