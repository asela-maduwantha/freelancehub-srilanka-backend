import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'User ID to send notification to',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Notification type',
    enum: ['message', 'proposal', 'payment', 'milestone', 'review'],
    example: 'message',
  })
  @IsEnum(['message', 'proposal', 'payment', 'milestone', 'review'])
  type: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Message Received',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification content',
    example: 'You have received a new message from John Doe',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Related entity information',
    type: Object,
    example: { entityType: 'message', entityId: '507f1f77bcf86cd799439012' },
  })
  @IsOptional()
  @IsObject()
  relatedEntity?: {
    entityType: string;
    entityId: string;
  };

  @ApiPropertyOptional({
    description: 'Notification priority',
    enum: ['low', 'medium', 'high', 'urgent'],
    example: 'medium',
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string;
}

export class UpdateNotificationDto {
  @ApiPropertyOptional({
    description: 'Mark notification as read',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}

export class NotificationResponseDto {
  @ApiProperty({
    description: 'Notification ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  userId: string;

  @ApiProperty({
    description: 'Notification type',
    example: 'message',
  })
  type: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Message Received',
  })
  title: string;

  @ApiProperty({
    description: 'Notification content',
    example: 'You have received a new message from John Doe',
  })
  content: string;

  @ApiPropertyOptional({
    description: 'Related entity information',
  })
  relatedEntity?: {
    entityType: string;
    entityId: string;
  };

  @ApiProperty({
    description: 'Notification priority',
    example: 'medium',
  })
  priority: string;

  @ApiProperty({
    description: 'Read status',
    example: false,
  })
  isRead: boolean;

  @ApiPropertyOptional({
    description: 'Read timestamp',
  })
  readAt?: Date;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  createdAt?: Date;
}

export class NotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Enable email notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable push notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable message notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  messageNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable proposal notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  proposalNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable payment notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  paymentNotifications?: boolean;
}
