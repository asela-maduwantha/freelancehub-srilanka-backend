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
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationFilters } from './dto/notification-filters.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { Notification as NotificationSchema } from '../../database/schemas/notification.schema';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createNotificationDto: CreateNotificationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user notifications with filters' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async findAll(
    @Query() filters: NotificationFilters,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.findAll(userId, filters);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.findOne(id, userId);
  }

  @Put('mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  async markAsRead(
    @Body() markReadDto: MarkReadDto,
    @CurrentUser('id') userId: string,
  ) {
    if (markReadDto.notificationIds && markReadDto.notificationIds.length > 0) {
      // Mark multiple notifications as read
      const results: NotificationSchema[] = [];
      for (const notificationId of markReadDto.notificationIds) {
        const result = await this.notificationsService.markAsRead(notificationId, userId);
        if (result) results.push(result);
      }
      return results;
    } else if (markReadDto.notificationId) {
      // Mark single notification as read
      return this.notificationsService.markAsRead(markReadDto.notificationId, userId);
    }
  }

  @Put('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.remove(id, userId);
  }
}
