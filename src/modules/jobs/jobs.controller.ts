import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import {
  JobResponseDto,
  JobsListResponseDto,
  MessageResponseDto,
} from './dto/job-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JobStatus } from '../../common/enums/job-status.enum';

@ApiTags('Jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new job' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Job created successfully',
    type: JobResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async create(
    @Body(ValidationPipe) createJobDto: CreateJobDto,
    @CurrentUser('id') clientId: string,
  ): Promise<JobResponseDto> {
    return this.jobsService.create(createJobDto, clientId);
  }

    @Get()
  @ApiOperation({ summary: 'Get all jobs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: JobStatus })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'clientId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Jobs retrieved successfully',
    type: JobsListResponseDto,
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: JobStatus,
    @Query('category') category?: string,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
  ): Promise<JobsListResponseDto> {
    return this.jobsService.findAll(
      page,
      limit,
      status,
      category,
      clientId,
      search,
    );
  }

  @Get('my-jobs')
  @ApiOperation({ summary: 'Get all jobs posted by current client' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: JobStatus })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Jobs retrieved successfully',
    type: JobsListResponseDto,
  })
  async getMyJobs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentUser('id') clientId: string,
    @Query('status') status?: JobStatus,
  ): Promise<JobsListResponseDto> {
    return this.jobsService.findMyJobs(page, limit, clientId, status);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured jobs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Featured jobs retrieved successfully',
    type: JobsListResponseDto,
  })
  async getFeaturedJobs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<JobsListResponseDto> {
    return this.jobsService.findFeaturedJobs(page, limit);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recently posted jobs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to look back (default: 7)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recent jobs retrieved successfully',
    type: JobsListResponseDto,
  })
  async getRecentJobs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('days') days: number = 7,
  ): Promise<JobsListResponseDto> {
    return this.jobsService.findRecentJobs(page, limit, days);
  }

  @Get('categories/:category')
  @ApiOperation({ summary: 'Get jobs by category' })
  @ApiParam({ name: 'category', description: 'Job category' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Jobs by category retrieved successfully',
    type: JobsListResponseDto,
  })
  async getJobsByCategory(
    @Param('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<JobsListResponseDto> {
    return this.jobsService.findJobsByCategory(category, page, limit);
  }

  @Get('recommended')

  @Get(':id')
  @ApiOperation({ summary: 'Get a job by ID' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job retrieved successfully',
    type: JobResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId?: string,
  ): Promise<JobResponseDto> {
    return this.jobsService.findOne(id, currentUserId);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job updated successfully',
    type: JobResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Unauthorized to update this job',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error or job cannot be modified',
  })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateJobDto: UpdateJobDto,
    @CurrentUser('id') clientId: string,
  ): Promise<JobResponseDto> {
    return this.jobsService.update(id, updateJobDto, clientId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Unauthorized to delete this job',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Job cannot be deleted',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') clientId: string,
  ): Promise<MessageResponseDto> {
    return this.jobsService.remove(id, clientId);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close job to new proposals' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job closed successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Unauthorized to close this job',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Job cannot be closed',
  })
  async closeJob(
    @Param('id') id: string,
    @CurrentUser('id') clientId: string,
  ): Promise<MessageResponseDto> {
    return this.jobsService.closeJob(id, clientId);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reopen job for proposals' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job reopened successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Unauthorized to reopen this job',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Job cannot be reopened',
  })
  async reopenJob(
    @Param('id') id: string,
    @CurrentUser('id') clientId: string,
  ): Promise<MessageResponseDto> {
    return this.jobsService.reopenJob(id, clientId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get job statistics' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Unauthorized to view job statistics',
  })
  async getJobStats(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.jobsService.getJobStats(id, userId);
  }

  @Get(':id/proposals')
  @ApiOperation({ summary: 'Get all proposals for a job (client only)' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job proposals retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Unauthorized to view job proposals',
  })
  async getJobProposals(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentUser('id') clientId: string,
  ) {
    return this.jobsService.getJobProposals(id, clientId, page, limit);
  }

  @Post(':id/save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save job to favorites (freelancer)' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job saved successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Job already saved',
  })
  async saveJob(
    @Param('id') id: string,
    @CurrentUser('id') freelancerId: string,
  ): Promise<MessageResponseDto> {
    return this.jobsService.saveJob(id, freelancerId);
  }

  @Delete(':id/save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove job from favorites' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job removed from favorites successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found or not saved',
  })
  async unsaveJob(
    @Param('id') id: string,
    @CurrentUser('id') freelancerId: string,
  ): Promise<MessageResponseDto> {
    return this.jobsService.unsaveJob(id, freelancerId);
  }

  @Get('saved')
  @ApiOperation({ summary: 'Get saved jobs (freelancer)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Saved jobs retrieved successfully',
    type: JobsListResponseDto,
  })
  async getSavedJobs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentUser('id') freelancerId: string,
  ): Promise<JobsListResponseDto> {
    return this.jobsService.getSavedJobs(freelancerId, page, limit);
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Report inappropriate job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job reported successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid report data or job already reported',
  })
  async reportJob(
    @Param('id') id: string,
    @Body() reportData: { reason: string; description?: string },
    @CurrentUser('id') reporterId: string,
  ): Promise<MessageResponseDto> {
    return this.jobsService.reportJob(id, reporterId, reportData);
  }
}
