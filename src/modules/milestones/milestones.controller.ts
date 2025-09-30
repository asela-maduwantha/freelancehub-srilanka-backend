import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
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
  ApiBody,
} from '@nestjs/swagger';
import { MilestoneService } from './milestones.service';
import {
  CreateMilestoneDto,
  UpdateMilestoneDto,
  SubmitMilestoneDto,
  MilestoneFilters,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Milestone } from 'src/database/schemas';

@ApiTags('Milestones')
@Controller('milestones')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@ApiBearerAuth()
export class MilestonesController {
  constructor(private readonly milestoneService: MilestoneService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new milestone (client only)' })
  @ApiBody({ type: CreateMilestoneDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Milestone created successfully',
    type: Milestone,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error or business rule violation',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the client can create milestones',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found',
  })
  async create(
    @Body(ValidationPipe) createMilestoneDto: CreateMilestoneDto,
    @CurrentUser('id') userId: string,
  ): Promise<Milestone> {
    return this.milestoneService.create(createMilestoneDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get milestones with filters' })
  @ApiQuery({ name: 'contractId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'in-progress', 'submitted', 'approved', 'rejected', 'paid'] })
  @ApiQuery({ name: 'isOverdue', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestones retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied to contract',
  })
  async findAll(
    @Query(ValidationPipe) filters: MilestoneFilters,
    @CurrentUser('id') userId: string,
  ): Promise<{ milestones: Milestone[]; total: number }> {
    return this.milestoneService.findAll(filters, userId);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue milestones for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Overdue milestones retrieved successfully',
    type: [Milestone],
  })
  async getOverdueMilestones(
    @CurrentUser('id') userId: string,
  ): Promise<Milestone[]> {
    return this.milestoneService.getOverdueMilestones(userId);
  }

  @Get('contract/:contractId/stats')
  @ApiOperation({ summary: 'Get milestone statistics for a contract' })
  @ApiParam({ name: 'contractId', description: 'Contract ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract milestone statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied to this contract',
  })
  async getContractMilestoneStats(
    @Param('contractId') contractId: string,
    @CurrentUser('id') userId: string,
  ): Promise<any> {
    return this.milestoneService.getContractMilestoneStats(contractId, userId);
  }

  @Get('contract/:contractId/milestones')
  @ApiOperation({ summary: 'Get all milestones for a specific contract' })
  @ApiParam({ name: 'contractId', description: 'Contract ID' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'in-progress', 'submitted', 'approved', 'rejected', 'paid'], description: 'Filter by milestone status' })
  @ApiQuery({ name: 'isOverdue', required: false, type: Boolean, description: 'Filter overdue milestones' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract milestones retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied to this contract',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found',
  })
  async getMilestonesByContract(
    @Param('contractId') contractId: string,
    @Query() filters: Omit<MilestoneFilters, 'contractId'>,
    @CurrentUser('id') userId: string,
  ): Promise<{ milestones: Milestone[]; total: number }> {
    // Add the contractId to the filters
    const milestoneFilters: MilestoneFilters = {
      ...filters,
      contractId,
    };
    return this.milestoneService.findAll(milestoneFilters, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get milestone by ID' })
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestone retrieved successfully',
    type: Milestone,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Milestone not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied to this milestone',
  })
  async findById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<Milestone> {
    return this.milestoneService.findById(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update milestone (client only)' })
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  @ApiBody({ type: UpdateMilestoneDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestone updated successfully',
    type: Milestone,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot update milestone in current state',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the client can update milestones',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Milestone not found',
  })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateMilestoneDto: UpdateMilestoneDto,
    @CurrentUser('id') userId: string,
  ): Promise<Milestone> {
    return this.milestoneService.update(id, updateMilestoneDto, userId);
  }

  @Put(':id/submit')
  @ApiOperation({ summary: 'Submit milestone for review (freelancer only)' })
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  @ApiBody({ type: SubmitMilestoneDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestone submitted successfully',
    type: Milestone,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Milestone cannot be submitted in current state',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the freelancer can submit milestones',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Milestone not found',
  })
  async submit(
    @Param('id') id: string,
    @Body(ValidationPipe) submitMilestoneDto: SubmitMilestoneDto,
    @CurrentUser('id') userId: string,
  ): Promise<Milestone> {
    return this.milestoneService.submit(id, submitMilestoneDto, userId);
  }

  @Put(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve submitted milestone (client only)' })
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestone approved successfully',
    type: Milestone,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only submitted milestones can be approved',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the client can approve milestones',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Milestone not found',
  })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<Milestone> {
    return this.milestoneService.approve(id, userId);
  }

  @Put(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject submitted milestone (client only)' })
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  @ApiBody({
    description: 'Rejection feedback',
    schema: {
      type: 'object',
      properties: {
        feedback: {
          type: 'string',
          description: 'Reason for rejection',
        },
      },
      required: ['feedback'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestone rejected successfully',
    type: Milestone,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only submitted milestones can be rejected or feedback is required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the client can reject milestones',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Milestone not found',
  })
  async reject(
    @Param('id') id: string,
    @Body('feedback') feedback: string,
    @CurrentUser('id') userId: string,
  ): Promise<Milestone> {
    return this.milestoneService.reject(id, feedback, userId);
  }

  @Put(':id/in-progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark milestone as in progress (freelancer only)' })
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestone marked as in progress successfully',
    type: Milestone,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only pending or rejected milestones can be marked as in progress',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the freelancer can mark milestones as in progress',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Milestone not found',
  })
  async markInProgress(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<Milestone> {
    return this.milestoneService.markInProgress(id, userId);
  }

  @Put('contract/:contractId/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder milestones within a contract (client only)' })
  @ApiParam({ name: 'contractId', description: 'Contract ID' })
  @ApiBody({
    description: 'Milestone order updates',
    schema: {
      type: 'object',
      properties: {
        milestoneOrders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              order: { type: 'number' },
            },
            required: ['id', 'order'],
          },
        },
      },
      required: ['milestoneOrders'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestones reordered successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot reorder milestones that have been submitted, approved, or paid',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the client can reorder milestones',
  })
  async reorderMilestones(
    @Param('contractId') contractId: string,
    @Body('milestoneOrders') milestoneOrders: { id: string; order: number }[],
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.milestoneService.reorderMilestones(contractId, milestoneOrders, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete milestone (client only)' })
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Milestone deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete milestone that has been submitted, approved, or paid',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the client can delete milestones',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Milestone not found',
  })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.milestoneService.delete(id, userId);
  }
}
