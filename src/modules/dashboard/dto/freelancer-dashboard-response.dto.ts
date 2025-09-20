import { ApiProperty } from '@nestjs/swagger';

export class FreelancerDashboardStatsDto {
  @ApiProperty({ description: 'Total number of proposals submitted' })
  totalProposals: number;

  @ApiProperty({ description: 'Number of active proposals' })
  activeProposals: number;

  @ApiProperty({ description: 'Number of active contracts' })
  activeContracts: number;

  @ApiProperty({ description: 'Number of completed projects' })
  completedProjects: number;

  @ApiProperty({ description: 'Total earnings' })
  totalEarnings: number;

  @ApiProperty({ description: 'This month earnings' })
  monthlyEarnings: number;

  @ApiProperty({ description: 'Average rating' })
  averageRating: number;

  @ApiProperty({ description: 'Total reviews count' })
  totalReviews: number;
}

export class RecentProposalDto {
  @ApiProperty({ description: 'Proposal ID' })
  id: string;

  @ApiProperty({ description: 'Job title' })
  jobTitle: string;

  @ApiProperty({ description: 'Proposal status' })
  status: string;

  @ApiProperty({ description: 'Proposed amount' })
  proposedAmount: number;

  @ApiProperty({ description: 'Proposal submitted date' })
  submittedAt: Date;

  @ApiProperty({ description: 'Client name' })
  clientName: string;
}

export class ActiveContractDto {
  @ApiProperty({ description: 'Contract ID' })
  id: string;

  @ApiProperty({ description: 'Job title' })
  jobTitle: string;

  @ApiProperty({ description: 'Client name' })
  clientName: string;

  @ApiProperty({ description: 'Contract status' })
  status: string;

  @ApiProperty({ description: 'Contract value' })
  contractValue: number;

  @ApiProperty({ description: 'Next milestone deadline', required: false })
  nextMilestoneDeadline?: Date;

  @ApiProperty({ description: 'Progress percentage' })
  progress: number;
}

export class FreelancerDashboardResponseDto {
  @ApiProperty({ description: 'Dashboard statistics' })
  stats: FreelancerDashboardStatsDto;

  @ApiProperty({ description: 'Recent proposals', type: [RecentProposalDto] })
  recentProposals: RecentProposalDto[];

  @ApiProperty({ description: 'Active contracts', type: [ActiveContractDto] })
  activeContracts: ActiveContractDto[];

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Success status' })
  success: boolean;
}