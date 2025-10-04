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
import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';

import {
  ProposalResponseDto,
  ProposalsListResponseDto,
} from './dto/proposal-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProposalStatus } from '../../common/enums/proposal-status.enum';
import { ThrottlerGuard } from '@nestjs/throttler';
import { MessageResponseDto } from 'src/common/dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Proposals')
@Controller('proposals')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
@ApiBearerAuth()
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.FREELANCER)
  @ApiOperation({ summary: 'Create a new proposal' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Proposal created successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error or duplicate proposal',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Too many requests',
  })
  async create(
    @Body(ValidationPipe) createProposalDto: CreateProposalDto,
    @CurrentUser('id') freelancerId: string,
  ): Promise<ProposalResponseDto> {
    return this.proposalsService.create(createProposalDto, freelancerId);
  }

  @Get('job/:jobId')
  @ApiOperation({ summary: 'Get proposals for a specific job' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Proposals retrieved successfully',
    type: ProposalsListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Too many requests',
  })
  async findByJobId(
    @Param('jobId') jobId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentUser('id') clientId: string,
  ): Promise<ProposalsListResponseDto> {
    return this.proposalsService.findByJobId(jobId, clientId, page, limit);
  }

  @Get('my')
  @ApiOperation({ summary: "Get current user's proposals" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ProposalStatus })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Proposals retrieved successfully',
    type: ProposalsListResponseDto,
  })
  async findMyProposals(
    @CurrentUser('id') freelancerId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: ProposalStatus,
  ): Promise<ProposalsListResponseDto> {
    return this.proposalsService.findMyProposals(
      freelancerId,
      page,
      limit,
      status,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a proposal by ID' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Proposal retrieved successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Proposal not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to view this proposal',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<ProposalResponseDto> {
    return this.proposalsService.findOne(id, userId);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a proposal' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Proposal updated successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Proposal not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to update this proposal',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Proposal cannot be modified',
  })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateProposalDto: UpdateProposalDto,
    @CurrentUser('id') freelancerId: string,
  ): Promise<ProposalResponseDto> {
    return this.proposalsService.update(id, updateProposalDto, freelancerId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a proposal' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Proposal deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Proposal not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to delete this proposal',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Proposal cannot be deleted',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') freelancerId: string,
  ): Promise<MessageResponseDto> {
    return this.proposalsService.remove(id, freelancerId);
  }

  @Put(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a proposal' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Proposal accepted successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Proposal not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to accept this proposal',
  })
  async acceptProposal(
    @Param('id') id: string,
    @CurrentUser('id') clientId: string,
  ): Promise<ProposalResponseDto> {
    return this.proposalsService.acceptProposal(id, clientId);
  }

  @Put(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a proposal' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Proposal rejected successfully',
    type: ProposalResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Proposal not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to reject this proposal',
  })
  async rejectProposal(
    @Param('id') id: string,
    @CurrentUser('id') clientId: string,
  ): Promise<ProposalResponseDto> {
    return this.proposalsService.rejectProposal(id, clientId);
  }
}
