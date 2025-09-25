import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '../../common/enums/notification-type.enum';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedClients = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token;

      if (!token) {
        this.logger.warn('Connection attempt without token');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.id;

      if (!client.userId) {
        this.logger.warn('Failed to extract user ID from token');
        client.disconnect();
        return;
      }

      // Store the connection
      this.connectedClients.set(client.userId, client.id);

      this.logger.log(`Client connected: ${client.id} (User: ${client.userId})`);

      // Send unread count to the newly connected client
      const unreadCount = await this.notificationsService.getUnreadCount(client.userId);
      client.emit('unread_count', { count: unreadCount });

    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedClients.delete(client.userId);
      this.logger.log(`Client disconnected: ${client.id} (User: ${client.userId})`);
    } else {
      this.logger.log(`Client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @MessageBody() data: { notificationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;

    try {
      await this.notificationsService.markAsRead(data.notificationId, client.userId);

      // Update unread count for this user
      const unreadCount = await this.notificationsService.getUnreadCount(client.userId);
      client.emit('unread_count', { count: unreadCount });

      client.emit('notification_updated', {
        notificationId: data.notificationId,
        action: 'marked_read'
      });

    } catch (error) {
      client.emit('error', { message: 'Failed to mark notification as read' });
    }
  }

  @SubscribeMessage('mark_all_read')
  async handleMarkAllRead(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) return;

    try {
      await this.notificationsService.markAllAsRead(client.userId);

      client.emit('unread_count', { count: 0 });
      client.emit('all_notifications_read');

    } catch (error) {
      client.emit('error', { message: 'Failed to mark all notifications as read' });
    }
  }

  @SubscribeMessage('get_unread_count')
  async handleGetUnreadCount(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) return;

    try {
      const unreadCount = await this.notificationsService.getUnreadCount(client.userId);
      client.emit('unread_count', { count: unreadCount });
    } catch (error) {
      client.emit('error', { message: 'Failed to get unread count' });
    }
  }

  // Public methods for sending notifications
  async sendNotificationToUser(userId: string, notification: any) {
    const socketId = this.connectedClients.get(userId);
    if (socketId) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('notification', notification);

        // Update unread count
        const unreadCount = await this.notificationsService.getUnreadCount(userId);
        socket.emit('unread_count', { count: unreadCount });

        this.logger.log(`Sent real-time notification to user: ${userId}`);
      }
    }
  }

  async broadcastToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedClients.get(userId);
    if (socketId) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(event, data);
      }
    }
  }

  async updateUnreadCount(userId: string) {
    const socketId = this.connectedClients.get(userId);
    if (socketId) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        const unreadCount = await this.notificationsService.getUnreadCount(userId);
        socket.emit('unread_count', { count: unreadCount });
      }
    }
  }

  // Helper method to get connected users count
  getConnectedUsersCount(): number {
    return this.connectedClients.size;
  }

  // Helper method to check if user is connected
  isUserConnected(userId: string): boolean {
    return this.connectedClients.has(userId);
  }
}