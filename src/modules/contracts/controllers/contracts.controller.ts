import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ContractsService } from '../services/contracts.service';
import { CreateContractDto } from '../dto/create-contract.dto';
import { UpdateMilestoneDto } from '../dto/update-milestone.dto';
import { SubmitMilestoneDto } from '../dto/submit-milestone.dto';
import { ApproveMilestoneDto } from '../dto/approve-milestone.dto';
import { RejectMilestoneDto } from '../dto/reject-milestone.dto';
import { CancelContractDto } from '../dto/cancel-contract.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('contracts')
@ApiBearerAuth('JWT-auth')
@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contract' })
  @ApiResponse({
    status: 201,
    description: 'Contract created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        budget: { type: 'number' },
        status: { type: 'string' },
        freelancerId: { type: 'string' },
        clientId: { type: 'string' },
        milestones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              amount: { type: 'number' },
              dueDate: { type: 'string', format: 'date-time' },
              status: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createContract(@Body() createContractDto: CreateContractDto) {
    return this.contractsService.createContract(createContractDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user contracts' })
  @ApiResponse({
    status: 200,
    description: 'Contracts retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
          budget: { type: 'number' },
          freelancer: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
          },
          client: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getUserContracts(@Request() req) {
    return this.contractsService.getUserContracts(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contract by ID' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not contract participant' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async getContractById(@Param('id') contractId: string, @Request() req) {
    return this.contractsService.getContractById(contractId, req.user.userId);
  }

  @Put(':id/milestones/:milestoneId')
  @ApiOperation({ summary: 'Update milestone' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone ID' })
  @ApiResponse({
    status: 200,
    description: 'Milestone updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Milestone updated successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized' })
  @ApiResponse({ status: 404, description: 'Contract or milestone not found' })
  async updateMilestone(
    @Param('id') contractId: string,
    @Param('milestoneId') milestoneId: string,
    @Request() req,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
  ) {
    return this.contractsService.updateMilestone(
      contractId,
      milestoneId,
      req.user.userId,
      updateMilestoneDto,
    );
  }

  @Post(':id/milestones/:milestoneId/submit')
  @ApiOperation({ summary: 'Submit work for milestone' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone ID' })
  @ApiResponse({
    status: 200,
    description: 'Work submitted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Work submitted successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not the freelancer' })
  async submitMilestoneWork(
    @Param('id') contractId: string,
    @Param('milestoneId') milestoneId: string,
    @Request() req,
    @Body() submitMilestoneDto: SubmitMilestoneDto,
  ) {
    return this.contractsService.submitMilestoneWork(
      contractId,
      milestoneId,
      req.user.userId,
      submitMilestoneDto,
    );
  }

  @Post(':id/milestones/:milestoneId/approve')
  @ApiOperation({ summary: 'Approve milestone work' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone ID' })
  @ApiResponse({
    status: 200,
    description: 'Milestone approved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Milestone approved successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not the client' })
  async approveMilestone(
    @Param('id') contractId: string,
    @Param('milestoneId') milestoneId: string,
    @Request() req,
    @Body() approveMilestoneDto: ApproveMilestoneDto,
  ) {
    return this.contractsService.approveMilestone(
      contractId,
      milestoneId,
      req.user.userId,
      approveMilestoneDto,
    );
  }

  @Post(':id/milestones/:milestoneId/reject')
  @ApiOperation({ summary: 'Reject milestone work' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone ID' })
  @ApiResponse({
    status: 200,
    description: 'Milestone rejected successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Milestone rejected successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not the client' })
  async rejectMilestone(
    @Param('id') contractId: string,
    @Param('milestoneId') milestoneId: string,
    @Request() req,
    @Body() rejectMilestoneDto: RejectMilestoneDto,
  ) {
    return this.contractsService.rejectMilestone(
      contractId,
      milestoneId,
      req.user.userId,
      rejectMilestoneDto,
    );
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract completed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Contract completed successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized' })
  async completeContract(@Param('id') contractId: string, @Request() req) {
    return this.contractsService.completeContract(contractId, req.user.userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract cancelled successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Contract cancelled successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized' })
  async cancelContract(
    @Param('id') contractId: string,
    @Request() req,
    @Body() cancelContractDto: CancelContractDto,
  ) {
    return this.contractsService.cancelContract(contractId, req.user.userId, cancelContractDto);
  }
}
