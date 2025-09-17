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
import { UsersService } from '../users/users.service';
import { SavedJob } from '../../database/schemas/saved-job.schema';
import {
  JobReport,
  ReportReason,
} from '../../database/schemas/job-report.schema';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<Job>,
    private readonly proposalsService: ProposalsService,
    private readonly usersService: UsersService,
    @InjectModel(SavedJob.name) private readonly savedJobModel: Model<SavedJob>,
    @InjectModel(JobReport.name)
    private readonly jobReportModel: Model<JobReport>,
  ) {}

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

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: JobStatus,
    category?: string,
    clientId?: string,
    search?: string,
  ): Promise<JobsListResponseDto> {
    const skip = (page - 1) * limit;

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

    if (
      job.status !== JobStatus.OPEN &&
      job.clientId?._id?.toString() !== clientId
    ) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    return this.mapToJobResponseDto(job);
  }

  async update(
    id: string,
    updateJobDto: UpdateJobDto,
    clientId: string,
  ): Promise<JobResponseDto> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }
    if (job.clientId.toString() !== clientId) {
      throw new ForbiddenException(RESPONSE_MESSAGES.JOB.UNAUTHORIZED);
    }

    if (job.status !== JobStatus.DRAFT && job.status !== JobStatus.OPEN) {
      throw new BadRequestException(RESPONSE_MESSAGES.JOB.CANNOT_MODIFY);
    }

    const updateData: any = {};

    const addIfDefined = (key: string, value: any) => {
      if (value !== undefined) {
        updateData[key] = value;
      }
    };

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

    if (updateJobDto.budget !== undefined) {
      if (
        updateJobDto.budget.type !== undefined &&
        updateJobDto.budget.min !== undefined
      ) {
        updateData.budget = updateJobDto.budget;
      } else {
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

    if (updateJobDto.duration !== undefined) {
      if (updateJobDto.duration.type !== undefined) {
        updateData.duration = updateJobDto.duration;
      } else {
        if (updateJobDto.duration.estimatedHours !== undefined) {
          updateData['duration.estimatedHours'] =
            updateJobDto.duration.estimatedHours;
        }
      }
    }

    if (updateJobDto.location !== undefined) {
      if (updateJobDto.location.type !== undefined) {
        updateData.location = updateJobDto.location;
      } else {
        if (updateJobDto.location.countries !== undefined) {
          updateData['location.countries'] = updateJobDto.location.countries;
        }
        if (updateJobDto.location.timezone !== undefined) {
          updateData['location.timezone'] = updateJobDto.location.timezone;
        }
      }
    }

    const updatedJob = await this.jobModel
      .findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .populate('clientId', 'email profile.firstName profile.lastName')
      .exec();

    if (!updatedJob) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    return this.mapToJobResponseDto(updatedJob);
  }

  async remove(id: string, clientId: string): Promise<MessageResponseDto> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    if (job.clientId.toString() !== clientId) {
      throw new ForbiddenException(RESPONSE_MESSAGES.JOB.UNAUTHORIZED);
    }

    if (job.status !== JobStatus.DRAFT && job.status !== JobStatus.CANCELLED) {
      throw new BadRequestException(RESPONSE_MESSAGES.JOB.CANNOT_MODIFY);
    }

    await this.jobModel.findByIdAndDelete(id).exec();

    return { message: RESPONSE_MESSAGES.JOB.DELETED };
  }

  async findMyJobs(
    page: number = 1,
    limit: number = 10,
    clientId: string,
    status?: JobStatus,
  ): Promise<JobsListResponseDto> {
    const skip = (page - 1) * limit;

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

  async closeJob(id: string, clientId: string): Promise<MessageResponseDto> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    if (job.clientId.toString() !== clientId) {
      throw new ForbiddenException(RESPONSE_MESSAGES.JOB.UNAUTHORIZED);
    }

    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException('Job is not open and cannot be closed');
    }

    await this.jobModel
      .findByIdAndUpdate(id, { status: JobStatus.COMPLETED })
      .exec();

    return { message: 'Job closed successfully' };
  }

  async reopenJob(id: string, clientId: string): Promise<MessageResponseDto> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    if (job.clientId.toString() !== clientId) {
      throw new ForbiddenException(RESPONSE_MESSAGES.JOB.UNAUTHORIZED);
    }

    if (job.status !== JobStatus.COMPLETED) {
      throw new BadRequestException('Only completed jobs can be reopened');
    }

    await this.jobModel
      .findByIdAndUpdate(id, { status: JobStatus.OPEN })
      .exec();

    return { message: 'Job reopened successfully' };
  }

  async findFeaturedJobs(
    page: number = 1,
    limit: number = 10,
  ): Promise<JobsListResponseDto> {
    const skip = (page - 1) * limit;

    const filter = {
      status: JobStatus.OPEN,
      isFeatured: true,
      deletedAt: { $exists: false },
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

  async findRecentJobs(
    page: number = 1,
    limit: number = 10,
    days: number = 7,
  ): Promise<JobsListResponseDto> {
    const skip = (page - 1) * limit;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const filter = {
      status: JobStatus.OPEN,
      postedAt: { $gte: dateThreshold },
      deletedAt: { $exists: false },
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

  async findJobsByCategory(
    category: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<JobsListResponseDto> {
    const skip = (page - 1) * limit;

    const filter = {
      status: JobStatus.OPEN,
      category: { $regex: new RegExp(category, 'i') },
      deletedAt: { $exists: false },
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

  async findRecommendedJobs(
    freelancerId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<JobsListResponseDto> {
    const skip = (page - 1) * limit;

    const freelancer = await this.usersService.getCurrentUser(freelancerId);
    const freelancerSkills = freelancer.freelancerData?.skills || [];

    const filter = {
      status: JobStatus.OPEN,
      deletedAt: { $exists: false },
    };

    const jobsQuery = this.jobModel
      .find(filter)
      .populate('clientId', 'email profile.firstName profile.lastName')
      .lean();

    if (freelancerSkills.length > 0) {
      const skillRegex = new RegExp(freelancerSkills.join('|'), 'i');

      const skillMatchedJobs = await this.jobModel
        .find({
          ...filter,
          skills: {
            $in: freelancerSkills.map((skill) => new RegExp(skill, 'i')),
          },
        })
        .populate('clientId', 'email profile.firstName profile.lastName')
        .lean()
        .sort({ postedAt: -1, isUrgent: -1, isFeatured: -1 })
        .limit(limit * 2)
        .exec();

      if (skillMatchedJobs.length > 0) {
        const scoredJobs = skillMatchedJobs.map((job) => {
          const jobSkills = Array.isArray(job.skills) ? job.skills : [];
          const matchingSkills = jobSkills.filter((jobSkill: string) =>
            freelancerSkills.some(
              (freelancerSkill) =>
                freelancerSkill
                  .toLowerCase()
                  .includes(jobSkill.toLowerCase()) ||
                jobSkill.toLowerCase().includes(freelancerSkill.toLowerCase()),
            ),
          );

          const skillMatchScore =
            matchingSkills.length / Math.max(jobSkills.length, 1);
          const urgencyBonus = job.isUrgent ? 0.3 : 0;
          const featuredBonus = job.isFeatured ? 0.2 : 0;

          return {
            ...job,
            skillMatchScore: skillMatchScore + urgencyBonus + featuredBonus,
          };
        });

        scoredJobs.sort((a, b) => b.skillMatchScore - a.skillMatchScore);

        const paginatedJobs = scoredJobs.slice(skip, skip + limit);
        const total = Math.min(
          scoredJobs.length,
          await this.jobModel.countDocuments(filter).exec(),
        );

        return {
          jobs: paginatedJobs.map((job) => this.mapToJobResponseDto(job)),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      }
    }

    const [jobs, total] = await Promise.all([
      jobsQuery
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

  async getJobStats(id: string, userId: string) {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    if (job.clientId.toString() !== userId) {
      throw new ForbiddenException('Only job owner can view statistics');
    }

    const daysPosted = Math.floor(
      (Date.now() - job.postedAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      jobId: id,
      views: 0,
      proposalCount: job.proposalCount || 0,
      daysPosted,
      status: job.status,
      isActive: job.status === JobStatus.OPEN && !job.deletedAt,
      isExpired: job.expiresAt ? new Date() > job.expiresAt : false,
    };
  }

  async getJobProposals(
    id: string,
    clientId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    if (job.clientId.toString() !== clientId) {
      throw new ForbiddenException('Only job owner can view proposals');
    }

    return this.proposalsService.findByJobId(id, clientId, page, limit);
  }

  async saveJob(id: string, freelancerId: string): Promise<MessageResponseDto> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    const existingSavedJob = await this.savedJobModel
      .findOne({
        jobId: id,
        freelancerId,
      })
      .exec();

    if (existingSavedJob) {
      throw new BadRequestException('Job is already saved');
    }

    const savedJob = new this.savedJobModel({
      jobId: id,
      freelancerId,
    });

    await savedJob.save();

    return { message: 'Job saved successfully' };
  }

  async unsaveJob(
    id: string,
    freelancerId: string,
  ): Promise<MessageResponseDto> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    const savedJob = await this.savedJobModel
      .findOne({
        jobId: id,
        freelancerId,
      })
      .exec();

    if (!savedJob) {
      throw new NotFoundException('Job is not saved');
    }

    await this.savedJobModel.findByIdAndDelete(savedJob._id).exec();

    return { message: 'Job removed from favorites successfully' };
  }

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

    const jobs = savedJobs
      .filter((savedJob: any) => savedJob.jobId)
      .map((savedJob: any) => this.mapToJobResponseDto(savedJob.jobId));

    return {
      jobs,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async reportJob(
    id: string,
    reporterId: string,
    reportData: { reason: string; description?: string },
  ): Promise<MessageResponseDto> {
    const job = await this.jobModel.findById(id).exec();

    if (!job) {
      throw new NotFoundException(RESPONSE_MESSAGES.JOB.NOT_FOUND);
    }

    if (
      !Object.values(ReportReason).includes(reportData.reason as ReportReason)
    ) {
      throw new BadRequestException('Invalid report reason');
    }

    const existingReport = await this.jobReportModel
      .findOne({
        jobId: id,
        reporterId,
      })
      .exec();

    if (existingReport) {
      throw new BadRequestException('You have already reported this job');
    }

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

    const isActive = job.status === JobStatus.OPEN && !job.deletedAt;
    const isExpired = job.expiresAt
      ? new Date() > new Date(job.expiresAt)
      : false;
    const canReceiveProposals =
      isActive &&
      !isExpired &&
      (!job.maxProposals || job.proposalCount < job.maxProposals);

    const clientDto = new ClientResponseDto();
    clientDto.id = client?._id?.toString() || '';
    clientDto.email = client?.email || '';
    clientDto.fullName = client
      ? `${clientProfile.firstName || ''} ${clientProfile.lastName || ''}`.trim()
      : '';
    clientDto.avatar = clientProfile.avatar;

    const budgetDto = new BudgetResponseDto();
    if (job.budget) {
      budgetDto.type = job.budget.type;
      budgetDto.min = job.budget.min;
      budgetDto.max = job.budget.max;
      budgetDto.currency = job.budget.currency || 'USD';
    }

    let durationDto: DurationResponseDto | undefined;
    if (job.duration) {
      durationDto = new DurationResponseDto();
      durationDto.type = job.duration.type;
      durationDto.estimatedHours = job.duration.estimatedHours;
    }

    let locationDto: JobLocationResponseDto | undefined;
    if (job.location) {
      locationDto = new JobLocationResponseDto();
      locationDto.type = job.location.type;
      locationDto.countries = job.location.countries
        ? [...job.location.countries]
        : undefined;
      locationDto.timezone = job.location.timezone;
    }

    const attachments = (job.attachments || []).map((attachment: any) => {
      const attachmentDto = new AttachmentResponseDto();
      attachmentDto.filename = attachment.filename;
      attachmentDto.url = attachment.url;
      attachmentDto.size = attachment.size;
      attachmentDto.type = attachment.type;
      return attachmentDto;
    });

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
