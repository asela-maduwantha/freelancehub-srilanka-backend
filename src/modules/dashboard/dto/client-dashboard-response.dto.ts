import { ApiProperty } from '@nestjs/swagger';

export class ClientDashboardStatsDto {
  @ApiProperty({ description: 'Total number of jobs posted' })
  totalJobs: number;

  @ApiProperty({ description: 'Number of active jobs' })
  activeJobs: number;

  @ApiProperty({ description: 'Number of completed jobs' })
  completedJobs: number;

  @ApiProperty({ description: 'Number of active contracts' })
  activeContracts: number;

  @ApiProperty({ description: 'Total amount spent' })
  totalSpent: number;

  @ApiProperty({ description: 'Number of pending proposals' })
  pendingProposals: number;

  @ApiProperty({ description: 'Number of ongoing projects' })
  ongoingProjects: number;
}

export class RecentJobDto {
  @ApiProperty({ description: 'Job ID' })
  id: string;

  @ApiProperty({ description: 'Job title' })
  title: string;

  @ApiProperty({ description: 'Job status' })
  status: string;

  @ApiProperty({ description: 'Number of proposals received' })
  proposalsCount: number;

  @ApiProperty({ description: 'Job created date' })
  createdAt: Date;

  @ApiProperty({ description: 'Job budget' })
  budget: number;
}

export class RecentContractDto {
  @ApiProperty({ description: 'Contract ID' })
  id: string;

  @ApiProperty({ description: 'Job title' })
  jobTitle: string;

  @ApiProperty({ description: 'Freelancer name' })
  freelancerName: string;

  @ApiProperty({ description: 'Contract status' })
  status: string;

  @ApiProperty({ description: 'Contract value' })
  contractValue: number;

  @ApiProperty({ description: 'Contract start date' })
  startDate: Date;
}

export class ClientDashboardResponseDto {
  @ApiProperty({ description: 'Dashboard statistics' })
  stats: ClientDashboardStatsDto;

  @ApiProperty({ description: 'Recent jobs', type: [RecentJobDto] })
  recentJobs: RecentJobDto[];

  @ApiProperty({ description: 'Recent contracts', type: [RecentContractDto] })
  recentContracts: RecentContractDto[];

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Success status' })
  success: boolean;
}