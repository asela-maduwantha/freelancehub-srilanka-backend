import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';

export class ChartDataDto {
  @ApiProperty({
    description: 'Chart type',
    enum: ['revenue', 'jobs', 'contracts', 'earnings', 'spending'],
    example: 'revenue',
    required: false,
  })
  @IsOptional()
  @IsEnum(['revenue', 'jobs', 'contracts', 'earnings', 'spending'])
  type?: string;

  @ApiProperty({
    description: 'Period for data aggregation',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    example: 'monthly',
    required: false,
  })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  period?: string;

  @ApiProperty({
    description: 'Start date for data range',
    example: '2025-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for data range',
    example: '2025-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ChartDataPointDto {
  @ApiProperty({ description: 'Date or period label' })
  label: string;

  @ApiProperty({ description: 'Data value' })
  value: number;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: Record<string, any>;
}

export class ChartDataResponseDto {
  @ApiProperty({ description: 'Success flag' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({
    description: 'Chart data',
    type: 'object',
    properties: {
      title: { type: 'string' },
      type: { type: 'string' },
      data: { type: 'array', items: { $ref: '#/components/schemas/ChartDataPointDto' } },
      total: { type: 'number' },
      period: { type: 'string' },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
    },
  })
  data: {
    title: string;
    type: string;
    data: ChartDataPointDto[];
    total?: number;
    period: string;
    startDate?: Date;
    endDate?: Date;
  };
}

export class ActivityItemDto {
  @ApiProperty({ 
    description: 'Activity type',
    enum: ['job_created', 'proposal_submitted', 'contract_signed', 'milestone_completed', 'payment_received', 'review_received', 'message_received', 'dispute_opened']
  })
  type: string;

  @ApiProperty({ description: 'Activity title' })
  title: string;

  @ApiProperty({ description: 'Activity description' })
  description: string;

  @ApiProperty({ description: 'Related entity ID', required: false })
  entityId?: string;

  @ApiProperty({ description: 'Related entity type', required: false })
  entityType?: string;

  @ApiProperty({ description: 'Activity timestamp' })
  timestamp: Date;

  @ApiProperty({ description: 'Icon or indicator', required: false })
  icon?: string;
}

export class ActivityFeedResponseDto {
  @ApiProperty({ description: 'Success flag' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({
    description: 'Activity feed data',
    type: 'object',
    properties: {
      activities: { type: 'array', items: { $ref: '#/components/schemas/ActivityItemDto' } },
      total: { type: 'number' },
      page: { type: 'number' },
      limit: { type: 'number' },
      hasMore: { type: 'boolean' },
    },
  })
  data: {
    activities: ActivityItemDto[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export class QuickStatsDto {
  @ApiProperty({ description: 'Stat label' })
  label: string;

  @ApiProperty({ description: 'Stat value (can be string or number)' })
  value: string | number;

  @ApiProperty({ description: 'Change percentage from previous period', required: false })
  change?: number;

  @ApiProperty({ description: 'Trend direction', required: false, enum: ['up', 'down', 'neutral'] })
  trend?: string;

  @ApiProperty({ description: 'Icon identifier', required: false })
  icon?: string;
}

export class QuickStatsResponseDto {
  @ApiProperty({ description: 'Success flag' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({
    description: 'Quick stats data',
    type: 'object',
    properties: {
      stats: { type: 'array', items: { $ref: '#/components/schemas/QuickStatsDto' } },
      lastUpdated: { type: 'string', format: 'date-time' },
    },
  })
  data: {
    stats: QuickStatsDto[];
    lastUpdated: Date;
  };
}

export class DeadlineItemDto {
  @ApiProperty({ description: 'Deadline ID' })
  id: string;

  @ApiProperty({ description: 'Title' })
  title: string;

  @ApiProperty({ description: 'Type', enum: ['milestone', 'contract', 'proposal', 'job'] })
  type: string;

  @ApiProperty({ description: 'Due date' })
  dueDate: Date;

  @ApiProperty({ description: 'Days remaining' })
  daysRemaining: number;

  @ApiProperty({ description: 'Priority', enum: ['high', 'medium', 'low'] })
  priority: string;

  @ApiProperty({ description: 'Related entity ID' })
  entityId: string;

  @ApiProperty({ description: 'Status' })
  status: string;
}

export class DeadlinesResponseDto {
  @ApiProperty({ description: 'Success flag' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({
    description: 'Deadlines data',
    type: 'object',
    properties: {
      deadlines: { type: 'array', items: { $ref: '#/components/schemas/DeadlineItemDto' } },
      total: { type: 'number' },
      overdue: { type: 'number' },
      dueToday: { type: 'number' },
      dueThisWeek: { type: 'number' },
    },
  })
  data: {
    deadlines: DeadlineItemDto[];
    total: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
  };
}
