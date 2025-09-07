import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
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
import { NotificationService } from '../services/notification.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RateLimit } from '../../../common/guards/rate-limit.guard';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationResponseDto,
  NotificationPreferencesDto,
} from '../dto/notification.dto';
import { User, UserDocument } from '../../../schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @RateLimit({ requests: 20, windowMs: 60000 }) // 20 notifications per minute
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiBody({ type: CreateNotificationDto })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createNotification(@Body() createDto: CreateNotificationDto) {
    const notification =
      await this.notificationService.createNotification(createDto);
    return this.mapToResponseDto(notification);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean, example: false })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        notifications: {
          type: 'array',
          items: { $ref: '#/components/schemas/NotificationResponseDto' },
        },
        total: { type: 'number' },
        unreadCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserNotifications(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('isRead') isRead?: boolean,
  ) {
    const result = await this.notificationService.getUserNotifications(
      req.user.userId,
      page,
      limit,
      isRead,
    );

    return {
      notifications: result.notifications,
      total: result.total,
      unreadCount: result.unreadCount,
    };
  }

  @Put(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Param('id') notificationId: string, @Request() req) {
    await this.notificationService.markAsRead(notificationId, req.user.userId);
    return { message: 'Notification marked as read' };
  }

  @Put('read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(@Request() req) {
    await this.notificationService.markAllAsRead(req.user.userId);
    return { message: 'All notifications marked as read' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(
    @Param('id') notificationId: string,
    @Request() req,
  ) {
    await this.notificationService.deleteNotification(
      notificationId,
      req.user.userId,
    );
    return { message: 'Notification deleted successfully' };
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        unreadCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(@Request() req) {
    const { unreadCount } = await this.notificationService.getUserNotifications(
      req.user.userId,
      1,
      1,
    );
    return { unreadCount };
  }

  @Put('fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update FCM token for push notifications' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fcmToken: {
          type: 'string',
          description: 'Firebase Cloud Messaging token',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'FCM token updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateFCMToken(@Request() req, @Body() body: { fcmToken: string }) {
    await this.userModel.findByIdAndUpdate(req.user.userId, {
      fcmToken: body.fcmToken,
    });
    return { message: 'FCM token updated successfully' };
  }

  @Put('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiBody({ type: NotificationPreferencesDto })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateNotificationPreferences(
    @Request() req,
    @Body() preferences: NotificationPreferencesDto,
  ) {
    await this.userModel.findByIdAndUpdate(req.user.userId, {
      notificationPreferences: preferences,
    });
    return { message: 'Notification preferences updated successfully' };
  }

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully',
    type: NotificationPreferencesDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotificationPreferences(@Request() req) {
    const user = await this.userModel
      .findById(req.user.userId)
      .select('notificationPreferences')
      .lean();

    return (
      user?.notificationPreferences || {
        emailNotifications: true,
        pushNotifications: true,
        messageNotifications: true,
        proposalNotifications: true,
        paymentNotifications: true,
      }
    );
  }

  private mapToResponseDto(notification: any): NotificationResponseDto {
    return {
      id: notification._id.toString(),
      userId: notification.userId.toString(),
      type: notification.type,
      title: notification.title,
      content: notification.content,
      relatedEntity: notification.relatedEntity
        ? {
            entityType: notification.relatedEntity.entityType,
            entityId: notification.relatedEntity.entityId.toString(),
          }
        : undefined,
      priority: notification.priority,
      isRead: notification.isRead,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}
