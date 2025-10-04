import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
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
    origin: true,
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedClients = new Map<string, string>(); // userId -> socketId
  private isInitialized = false;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
  ) {
    this.connectedClients = new Map<string, string>();
    this.logger.log('🏗️ NotificationsGateway constructor called, connectedClients initialized');
  }

  // Getter to ensure Map is always available
  private getConnectedClients(): Map<string, string> {
    if (!this.connectedClients || typeof this.connectedClients.get !== 'function') {
      this.logger.warn('🔄 Reinitializing connectedClients Map due to corruption');
      this.connectedClients = new Map<string, string>();
    }
    return this.connectedClients;
  }

  // Helper to get the sockets Map - THE KEY FIX
  private getSocketsMap(): Map<string, Socket> {
    // this.server is the namespace, and .sockets is the Map of connected sockets
    return (this.server as any)?.sockets || new Map();
  }

  afterInit(server: Server) {
    this.logger.log('🚀 WebSocket Gateway initialized');
    this.logger.log(`📡 Socket.IO namespace: /notifications`);
    
    this.server = server;
    this.logger.debug(`🔧 Server assignment - this.server exists: ${!!this.server}`);
    
    // Log namespace information
    this.logger.log(`🔧 Namespace server type: ${this.server.constructor?.name}`);
    this.logger.log(`🔧 Server has sockets: ${!!(this.server as any).sockets}`);
    
    const corsConfig = {
      origin: true,
      credentials: true
    };
    this.logger.log(`🌐 CORS configuration: ${JSON.stringify(corsConfig)}`);
    
    try {
      if (server.adapter) {
        this.logger.log(`🔧 Socket.IO adapter: ${server.adapter.constructor?.name || 'Unknown'}`);
      }
    } catch (error) {
      this.logger.warn(`⚠️ Could not access adapter details: ${error.message}`);
    }
    
    // Set up server-level event listeners
    server.on('connection', (socket) => {
      this.logger.debug(`🔌 Raw namespace connection: ${socket.id}`);
    });

    this.startConnectionHealthMonitoring();
    this.isInitialized = true;
    this.logger.log('✅ NotificationsGateway ready for connections');
  }

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    const clientInfo = {
      id: client.id,
      ip: client.handshake.address,
      userAgent: client.handshake.headers['user-agent'],
      origin: client.handshake.headers.origin,
      transport: client.conn.transport.name,
      timestamp: new Date().toISOString()
    };
    
    this.logger.log(`🔌 New socket connection attempt: ${JSON.stringify(clientInfo)}`);
    
    try {
      const token = client.handshake.auth.token || client.handshake.query.token;

      if (!token) {
        this.logger.warn(`❌ Connection rejected - No token provided: ${client.id}`);
        client.disconnect();
        return;
      }

      this.logger.debug(`🔐 Verifying JWT token for client: ${client.id}`);
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      
      this.logger.debug(`📋 JWT payload - User ID: ${client.userId}`);

      if (!client.userId) {
        this.logger.warn(`❌ JWT token valid but no user ID found: ${client.id}`);
        client.disconnect();
        return;
      }

      const connectedClients = this.getConnectedClients();
      const existingSocketId = connectedClients.get(client.userId);
      if (existingSocketId && existingSocketId !== client.id) {
        this.logger.warn(`⚠️ User ${client.userId} already connected. Disconnecting old socket ${existingSocketId}`);
        
        const oldSocket = this.getSocketsMap().get(existingSocketId);
        if (oldSocket) {
          this.logger.log(`🔌 Disconnecting old socket ${existingSocketId}`);
          oldSocket.disconnect(true);
        }
      }
      
      connectedClients.set(client.userId, client.id);
      
      this.logger.log(`✅ Client connected - User: ${client.userId}, Socket: ${client.id}, Total: ${connectedClients.size}`);

      // Send unread count
      const unreadCount = await this.notificationsService.getUnreadCount(client.userId);
      client.emit('unread_count', { count: unreadCount });
      this.logger.debug(`📤 Sent initial unread count: ${unreadCount}`);

      // Send unread notifications
      if (unreadCount > 0) {
        const unreadNotifications = await this.notificationsService.getUnreadNotifications(client.userId);
        unreadNotifications.forEach(notification => {
          client.emit('notification', notification);
        });
        this.logger.log(`🚀 Delivered ${unreadNotifications.length} pending notifications to user: ${client.userId}`);
      }

    } catch (error) {
      this.logger.error(`❌ Connection failed: ${error.message}`, error.stack);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const connectedClients = this.getConnectedClients();
    
    if (client.userId) {
      connectedClients.delete(client.userId);
      this.logger.log(`🔌 Client disconnected - User: ${client.userId}, Socket: ${client.id}, Remaining: ${connectedClients.size}`);
    } else {
      this.logger.log(`🔌 Unauthenticated client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @MessageBody() data: { notificationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    this.logger.debug(`📨 mark_as_read from user ${client.userId}, notificationId: ${data.notificationId}`);
    
    if (!client.userId) {
      this.logger.warn(`❌ mark_as_read ignored - no user ID`);
      return;
    }

    try {
      await this.notificationsService.markAsRead(data.notificationId, client.userId);
      
      const unreadCount = await this.notificationsService.getUnreadCount(client.userId);
      client.emit('unread_count', { count: unreadCount });
      client.emit('notification_updated', {
        notificationId: data.notificationId,
        action: 'marked_read'
      });

      this.logger.debug(`✅ Notification marked as read, new count: ${unreadCount}`);
    } catch (error) {
      this.logger.error(`❌ Failed to mark as read: ${error.message}`, error.stack);
      client.emit('error', { message: 'Failed to mark notification as read' });
    }
  }

  @SubscribeMessage('mark_all_read')
  async handleMarkAllRead(@ConnectedSocket() client: AuthenticatedSocket) {
    this.logger.debug(`📨 mark_all_read from user ${client.userId}`);
    
    if (!client.userId) {
      return;
    }

    try {
      const result = await this.notificationsService.markAllAsRead(client.userId);
      this.logger.log(`✅ Marked all as read for user ${client.userId}. Count: ${result.modifiedCount}`);

      client.emit('unread_count', { count: 0 });
      client.emit('all_notifications_read');
    } catch (error) {
      this.logger.error(`❌ Failed to mark all as read: ${error.message}`, error.stack);
      client.emit('error', { message: 'Failed to mark all notifications as read' });
    }
  }

  @SubscribeMessage('get_unread_count')
  async handleGetUnreadCount(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return;
    }

    try {
      const unreadCount = await this.notificationsService.getUnreadCount(client.userId);
      client.emit('unread_count', { count: unreadCount });
      this.logger.debug(`📤 Sent unread count: ${unreadCount}`);
    } catch (error) {
      this.logger.error(`❌ Failed to get unread count: ${error.message}`, error.stack);
      client.emit('error', { message: 'Failed to get unread count' });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit('pong', {
      timestamp: Date.now(),
      userId: client.userId,
      socketId: client.id
    });
  }

  // Public methods for sending notifications
  async sendNotificationToUser(userId: string, notification: any) {
    this.logger.debug(`📤 Sending notification to user: ${userId}, type: ${notification?.type}`);
    
    if (!this.isInitialized) {
      this.logger.warn(`⚠️ Gateway not initialized`);
      return;
    }
    
    const cleanUserId = String(userId).trim();
    const connectedClients = this.getConnectedClients();
    const socketId = connectedClients.get(cleanUserId);
    
    this.logger.debug(`🔍 SocketId lookup: ${socketId}, Map size: ${connectedClients.size}`);
    
    if (!socketId) {
      this.logger.warn(`⚠️ User ${cleanUserId} not connected`);
      this.logger.debug(`🔍 Connected users: ${Array.from(connectedClients.keys()).join(', ')}`);
      return;
    }
    
    if (!this.server) {
      this.logger.error(`❌ Server not initialized`);
      return;
    }
    
    // Get the sockets Map - THIS IS THE KEY FIX
    const socketsMap = this.getSocketsMap();
    this.logger.debug(`🔍 Sockets Map size: ${socketsMap.size}`);
    
    const socket = socketsMap.get(socketId);
    if (!socket) {
      this.logger.warn(`⚠️ Socket ${socketId} not found. Cleaning up.`);
      connectedClients.delete(cleanUserId);
      return;
    }
    
    try {
      socket.emit('notification', notification);
      this.logger.debug(`✅ Emitted notification to socket ${socketId}`);

      const unreadCount = await this.notificationsService.getUnreadCount(cleanUserId);
      socket.emit('unread_count', { count: unreadCount });
      this.logger.debug(`✅ Emitted unread count: ${unreadCount}`);

      this.logger.log(`🚀 Successfully sent notification to user: ${cleanUserId}, type: ${notification?.type}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send notification: ${error.message}`, error.stack);
    }
  }

  async broadcastToUser(userId: string, event: string, data: any) {
    const connectedClients = this.getConnectedClients();
    const socketId = connectedClients.get(userId);
    if (!socketId) {
      return;
    }
    
    const socket = this.getSocketsMap().get(socketId);
    if (!socket) {
      connectedClients.delete(userId);
      return;
    }
    
    try {
      socket.emit(event, data);
      this.logger.debug(`✅ Broadcast '${event}' to user ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Broadcast failed: ${error.message}`, error.stack);
    }
  }

  async updateUnreadCount(userId: string) {
    const connectedClients = this.getConnectedClients();
    const socketId = connectedClients.get(userId);
    if (!socketId) {
      return;
    }
    
    const socket = this.getSocketsMap().get(socketId);
    if (!socket) {
      connectedClients.delete(userId);
      return;
    }
    
    try {
      const unreadCount = await this.notificationsService.getUnreadCount(userId);
      socket.emit('unread_count', { count: unreadCount });
      this.logger.debug(`✅ Updated unread count: ${unreadCount}`);
    } catch (error) {
      this.logger.error(`❌ Failed to update unread count: ${error.message}`, error.stack);
    }
  }

  getConnectedUsersCount(): number {
    return this.getConnectedClients().size;
  }

  isUserConnected(userId: string): boolean {
    return this.getConnectedClients().has(userId);
  }

  private startConnectionHealthMonitoring() {
    setInterval(() => {
      this.logConnectionStats();
    }, 5 * 60 * 1000);

    setInterval(() => {
      this.cleanupStaleConnections();
    }, 60 * 1000);

    this.logger.log('🔍 Connection health monitoring started');
  }

  private logConnectionStats() {
    const connectedClients = this.getConnectedClients();
    const socketsMap = this.getSocketsMap();
    
    if (connectedClients.size > 0) {
      this.logger.log(`📊 Stats - Connected: ${connectedClients.size}, Sockets Map: ${socketsMap.size}`);
    }
  }

  private cleanupStaleConnections() {
    const connectedClients = this.getConnectedClients();
    const socketsMap = this.getSocketsMap();
    let cleaned = 0;

    for (const [userId, socketId] of connectedClients.entries()) {
      const socket = socketsMap.get(socketId);
      if (!socket || !socket.connected) {
        connectedClients.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.warn(`🧹 Cleaned up ${cleaned} stale connections`);
    }
  }

  getConnectionInfo() {
    const connectedClients = this.getConnectedClients();
    const socketsMap = this.getSocketsMap();
    
    return {
      totalConnectedClients: connectedClients.size,
      socketsMapSize: socketsMap.size,
      connectedUsers: Array.from(connectedClients.entries()).map(([userId, socketId]) => ({
        userId,
        socketId,
        connected: socketsMap.get(socketId)?.connected || false
      })),
      timestamp: new Date().toISOString()
    };
  }

  async testConnectionToUser(userId: string): Promise<boolean> {
    const connectedClients = this.getConnectedClients();
    const socketId = connectedClients.get(userId);
    if (!socketId) {
      this.logger.debug(`❌ User ${userId} not in connected clients`);
      return false;
    }

    const socket = this.getSocketsMap().get(socketId);
    if (!socket || !socket.connected) {
      this.logger.debug(`❌ Socket not found or not connected`);
      connectedClients.delete(userId);
      return false;
    }

    try {
      socket.emit('ping', { timestamp: Date.now() });
      this.logger.debug(`✅ Connection test successful for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Connection test failed: ${error.message}`);
      return false;
    }
  }
}