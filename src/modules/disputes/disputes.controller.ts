import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DisputesService } from './disputes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  CreateDisputeDto,
  ResolveDisputeDto,
  AddEvidenceDto,
  UpdateDisputeStatusDto,
} from './dto';

@ApiTags('Disputes')
@ApiBearerAuth()
@Controller('disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new dispute' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Dispute created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or active dispute already exists',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a party to the contract',
  })
  async createDispute(
    @CurrentUser('id') userId: string,
    @Body() createDisputeDto: CreateDisputeDto,
  ) {
    return this.disputesService.createDispute(userId, createDisputeDto);
  }

  @Get('my-disputes')
  @ApiOperation({ summary: 'Get disputes where the current user is involved' })
  @ApiQuery({ name: 'status', required: false, enum: ['open', 'in_review', 'resolved', 'closed', 'escalated'] })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User disputes retrieved successfully',
  })
  async getMyDisputes(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.disputesService.getMyDisputes(userId, status, page, limit);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get dispute statistics for the current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  async getMyStatistics(@CurrentUser('id') userId: string) {
    return this.disputesService.getDisputeStatistics(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute details by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dispute not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have access to this dispute',
  })
  async getDisputeById(
    @CurrentUser('id') userId: string,
    @Param('id') disputeId: string,
  ) {
    return this.disputesService.getDisputeById(disputeId, userId);
  }

  @Post(':id/evidence')
  @ApiOperation({ summary: 'Add evidence to a dispute' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Evidence added successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot add evidence to closed dispute',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dispute not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a party to the dispute',
  })
  async addEvidence(
    @CurrentUser('id') userId: string,
    @Param('id') disputeId: string,
    @Body() addEvidenceDto: AddEvidenceDto,
  ) {
    return this.disputesService.addEvidence(disputeId, userId, addEvidenceDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update dispute status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute status updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dispute not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have permission to update status',
  })
  async updateStatus(
    @CurrentUser('id') userId: string,
    @Param('id') disputeId: string,
    @Body() updateStatusDto: UpdateDisputeStatusDto,
  ) {
    return this.disputesService.updateDisputeStatus(disputeId, userId, updateStatusDto);
  }

  @Post(':id/resolve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Resolve a dispute (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute resolved successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dispute is already resolved or closed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dispute not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only admins can resolve disputes',
  })
  async resolveDispute(
    @CurrentUser('id') adminId: string,
    @Param('id') disputeId: string,
    @Body() resolveDisputeDto: ResolveDisputeDto,
  ) {
    return this.disputesService.resolveDispute(disputeId, adminId, resolveDisputeDto);
  }

  @Post(':id/escalate')
  @ApiOperation({ summary: 'Escalate a dispute for admin review' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute escalated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Can only escalate open disputes',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dispute not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a party to the dispute',
  })
  async escalateDispute(
    @CurrentUser('id') userId: string,
    @Param('id') disputeId: string,
    @Body('notes') notes?: string,
  ) {
    return this.disputesService.escalateDispute(disputeId, userId, notes);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Close a dispute' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dispute closed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Can only close open disputes',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dispute not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have permission to close the dispute',
  })
  async closeDispute(
    @CurrentUser('id') userId: string,
    @Param('id') disputeId: string,
    @Body('reason') reason?: string,
  ) {
    return this.disputesService.closeDispute(disputeId, userId, reason);
  }

  // Admin endpoint to get all disputes (already in admin controller)
  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all disputes (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All disputes retrieved successfully',
  })
  async getAllDisputes(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ) {
    // This would call a different method or reuse the service method
    return { message: 'Use admin controller for comprehensive dispute management' };
  }
}
