import {
  Controller,
  Get,
  Post,
  Put,
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
import { DisputesService } from '../services/disputes.service';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { SubmitEvidenceDto } from '../dto/submit-evidence.dto';
import { AddMessageDto } from '../dto/add-message.dto';
import { UpdateDisputeStatusDto } from '../dto/update-dispute-status.dto';
import { ResolveDisputeDto } from '../dto/resolve-dispute.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('disputes')
@ApiBearerAuth('JWT-auth')
@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new dispute' })
  @ApiResponse({
    status: 201,
    description: 'Dispute created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', example: 'open' },
        contractId: { type: 'string' },
        initiatorId: { type: 'string' },
        respondentId: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createDispute(@Request() req, @Body() createDisputeDto: CreateDisputeDto) {
    return this.disputesService.createDispute(req.user.userId, createDisputeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user disputes' })
  @ApiResponse({
    status: 200,
    description: 'Disputes retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
          contract: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getUserDisputes(@Request() req) {
    return this.disputesService.getUserDisputes(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute by ID' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  @ApiResponse({
    status: 200,
    description: 'Dispute retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string' },
        contract: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            budget: { type: 'number' },
          },
        },
        initiator: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
        respondent: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              message: { type: 'string' },
              senderId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        evidence: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              description: { type: 'string' },
              fileUrl: { type: 'string' },
              submittedBy: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not dispute participant' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async getDisputeById(@Param('id') disputeId: string, @Request() req) {
    return this.disputesService.getDisputeById(disputeId, req.user.userId);
  }

  @Post(':id/evidence')
  @ApiOperation({ summary: 'Submit evidence for dispute' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  @ApiResponse({
    status: 201,
    description: 'Evidence submitted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Evidence submitted successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not dispute participant' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async submitEvidence(
    @Param('id') disputeId: string,
    @Request() req,
    @Body() submitEvidenceDto: SubmitEvidenceDto,
  ) {
    return this.disputesService.submitEvidence(disputeId, req.user.userId, submitEvidenceDto);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Add message to dispute' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  @ApiResponse({
    status: 201,
    description: 'Message added successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Message added successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not dispute participant' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async addMessage(
    @Param('id') disputeId: string,
    @Request() req,
    @Body() addMessageDto: AddMessageDto,
  ) {
    return this.disputesService.addMessage(disputeId, req.user.userId, addMessageDto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update dispute status' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  @ApiResponse({
    status: 200,
    description: 'Dispute status updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Dispute status updated successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async updateDisputeStatus(
    @Param('id') disputeId: string,
    @Request() req,
    @Body() updateDisputeStatusDto: UpdateDisputeStatusDto,
  ) {
    return this.disputesService.updateDisputeStatus(disputeId, req.user.userId, updateDisputeStatusDto);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve dispute' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  @ApiResponse({
    status: 200,
    description: 'Dispute resolved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Dispute resolved successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async resolveDispute(
    @Param('id') disputeId: string,
    @Request() req,
    @Body() resolveDisputeDto: ResolveDisputeDto,
  ) {
    return this.disputesService.resolveDispute(disputeId, req.user.userId, resolveDisputeDto);
  }

  @Get('admin/open')
  @ApiOperation({ summary: 'Get all open disputes (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Open disputes retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
          contractId: { type: 'string' },
          initiatorId: { type: 'string' },
          respondentId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  async getOpenDisputes() {
    return this.disputesService.getOpenDisputes();
  }
}
