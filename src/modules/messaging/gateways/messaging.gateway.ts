import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { MessagingService } from '../services/messaging.service';
import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('MessagingGateway');

  constructor(
    private readonly messagingService: MessagingService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      const token = (client.handshake.auth.token || client.handshake.query.token || '').replace(/^Bearer\s+/i, '');

      if (!token) {
        client.disconnect();
        return;
      }

      let payload: any;
      try {
        payload = this.jwtService.verify(token);
      } catch (verifyError) {
        this.logger.error(`Token verification failed: ${verifyError.message}`);
        throw verifyError; 
      }

      client.userId = payload.sub;
      client.user = payload;

      // Join user-specific room for notifications
      client.join(`user_${client.userId}`);

      this.logger.log(`Client connected: ${client.id} (User: ${client.userId})`);
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const { conversationId } = data;

      // Verify user has access to this conversation
      const conversation = await this.messagingService.getConversationById(conversationId);
      if (!conversation || !client.userId || !conversation.participants.includes(new Types.ObjectId(client.userId))) {
        client.emit('error', { message: 'Unauthorized access to conversation' });
        return;
      }

      client.join(`conversation_${conversationId}`);
      client.emit('joined_conversation', { conversationId });

      this.logger.log(`User ${client.userId} joined conversation ${conversationId}`);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { conversationId } = data;
    client.leave(`conversation_${conversationId}`);
    client.emit('left_conversation', { conversationId });

    this.logger.log(`User ${client.userId} left conversation ${conversationId}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: { conversationId: string; content: string; messageType?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const { conversationId, content, messageType = 'text' } = data;

      // Get conversation to find recipient
      const conversation = await this.messagingService.getConversationById(conversationId);
      const recipientId = conversation.participants.find(p => p.toString() !== client.userId);

      if (!client.userId || !recipientId) {
        client.emit('error', { message: 'Invalid user or recipient' });
        return;
      }

      const message = await this.messagingService.sendMessage({
        conversationId,
        content,
        recipientId: recipientId.toString(),
      }, client.userId, ''); // Note: For now using empty key, should be updated with proper encryption

      // Emit to all participants in the conversation
      this.server.to(`conversation_${conversationId}`).emit('new_message', message);

      // Also emit to sender's room for consistency
      this.server.to(`user_${client.userId}`).emit('message_sent', message);

      this.logger.log(`Message sent in conversation ${conversationId} by user ${client.userId}`);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @MessageBody() data: { conversationId: string; messageIds: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const { conversationId, messageIds } = data;

      if (!client.userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      await this.messagingService.markMessagesAsRead(conversationId, client.userId);

      // Notify other participants
      this.server.to(`conversation_${conversationId}`).emit('messages_read', {
        conversationId,
        userId: client.userId,
        messageIds,
      });

      this.logger.log(`Messages marked as read in conversation ${conversationId}`);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { conversationId } = data;

    // Broadcast typing indicator to other participants
    client.to(`conversation_${conversationId}`).emit('user_typing', {
      conversationId,
      userId: client.userId,
      isTyping: true,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { conversationId } = data;

    // Broadcast typing indicator to other participants
    client.to(`conversation_${conversationId}`).emit('user_typing', {
      conversationId,
      userId: client.userId,
      isTyping: false,
    });
  }

  // Method to emit notifications from other parts of the application
  emitNotification(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }

  // Method to emit project updates
  emitProjectUpdate(projectId: string, update: any) {
    this.server.to(`project_${projectId}`).emit('project_update', update);
  }

  // Method to emit to specific conversation
  emitToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation_${conversationId}`).emit(event, data);
  }
}
