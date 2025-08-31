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
  Query,
} from '@nestjs/common';
import { ProposalsService } from '../services/proposals.service';
import { SubmitProposalDto } from '../dto/submit-proposal.dto';
import { UpdateProposalDto } from '../dto/update-proposal.dto';
import { AcceptProposalDto } from '../dto/accept-proposal.dto';
import { RejectProposalDto } from '../dto/reject-proposal.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('proposals')
@UseGuards(JwtAuthGuard)
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post()
  async submitProposal(@Request() req, @Body() submitProposalDto: SubmitProposalDto) {
    return this.proposalsService.submitProposal(req.user.userId, submitProposalDto);
  }

  @Get()
  async getUserProposals(@Request() req) {
    return this.proposalsService.getUserProposals(req.user.userId);
  }

  @Get(':id')
  async getProposalById(@Param('id') proposalId: string, @Request() req) {
    return this.proposalsService.getProposalById(proposalId, req.user.userId);
  }

  @Put(':id')
  async updateProposal(
    @Param('id') proposalId: string,
    @Request() req,
    @Body() updateProposalDto: UpdateProposalDto,
  ) {
    return this.proposalsService.updateProposal(proposalId, req.user.userId, updateProposalDto);
  }

  @Delete(':id')
  async withdrawProposal(@Param('id') proposalId: string, @Request() req) {
    return this.proposalsService.withdrawProposal(proposalId, req.user.userId);
  }

  @Get('project/:projectId')
  async getProposalsForProject(@Param('projectId') projectId: string, @Request() req) {
    return this.proposalsService.getProposalsForProject(projectId, req.user.userId);
  }

  @Post(':id/accept')
  async acceptProposal(
    @Param('id') proposalId: string,
    @Request() req,
    @Body() acceptProposalDto: AcceptProposalDto,
  ) {
    return this.proposalsService.acceptProposal(proposalId, req.user.userId, acceptProposalDto);
  }

  @Post(':id/reject')
  async rejectProposal(
    @Param('id') proposalId: string,
    @Request() req,
    @Body() rejectProposalDto: RejectProposalDto,
  ) {
    return this.proposalsService.rejectProposal(proposalId, req.user.userId, rejectProposalDto);
  }
}
