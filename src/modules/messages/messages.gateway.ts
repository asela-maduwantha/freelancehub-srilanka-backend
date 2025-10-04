import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  Injectable,
  Logger,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessagesService } from './messages.service';
import { CreateMessageDto, SendMessageDto } from './dto';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/messages',
})
export class MessagesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);
  private userSocketMap = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(
    private readonly messagesService: MessagesService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract and verify JWT token
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify token
      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub || payload.userId;

      if (!userId) {
        this.logger.warn(`Connection rejected: Invalid token payload`);
        client.disconnect();
        return;
      }

      // Store user ID in socket data
      client.data.userId = userId;

      // Track socket connection
      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, new Set());
      }
      this.userSocketMap.get(userId)?.add(client.id);

      // Join user's personal room
      client.join(`user:${userId}`);

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);

      // Emit connection success
      client.emit('connected', { userId, socketId: client.id });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    try {
      const userId = client.data.userId;
      
      if (userId) {
        // Remove socket from user's socket set
        const userSockets = this.userSocketMap.get(userId);
        if (userSockets) {
          userSockets.delete(client.id);
          if (userSockets.size === 0) {
            this.userSocketMap.delete(userId);
          }
        }

        this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
      } else {
        this.logger.log(`Client disconnected: ${client.id}`);
      }
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`);
    }
  }

  /**
   * Handle joining a conversation room
   */
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = client.data.userId;
      const { conversationId } = data;

      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Verify user has access to this conversation
      await this.messagesService.getConversationById(userId, conversationId);

      // Join conversation room
      client.join(`conversation:${conversationId}`);

      this.logger.log(`User ${userId} joined conversation ${conversationId}`);

      return { success: true, conversationId };
    } catch (error) {
      this.logger.error(`Error joining conversation: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle leaving a conversation room
   */
  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const { conversationId } = data;

      // Leave conversation room
      client.leave(`conversation:${conversationId}`);

      this.logger.log(`Client ${client.id} left conversation ${conversationId}`);

      return { success: true, conversationId };
    } catch (error) {
      this.logger.error(`Error leaving conversation: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle sending a message
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() sendMessageDto: SendMessageDto,
  ) {
    try {
      const userId = client.data.userId;

      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Create message
      const message = await this.messagesService.sendMessage(userId, sendMessageDto);

      // Emit message to conversation room
      this.server
        .to(`conversation:${sendMessageDto.conversationId}`)
        .emit('new_message', message);

      // Also emit to receiver's personal room if they're not in the conversation room
      const receiverId = message.receiverId;
      this.server
        .to(`user:${receiverId}`)
        .emit('message_notification', {
          conversationId: sendMessageDto.conversationId,
          message,
        });

      this.logger.log(`Message sent from ${userId} in conversation ${sendMessageDto.conversationId}`);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle creating a new message (with contract/milestone context)
   */
  @SubscribeMessage('create_message')
  async handleCreateMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() createMessageDto: CreateMessageDto,
  ) {
    try {
      const userId = client.data.userId;

      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Create message
      const message = await this.messagesService.createMessage(userId, createMessageDto);

      // Emit message to conversation room
      this.server
        .to(`conversation:${message.conversationId}`)
        .emit('new_message', message);

      // Also emit to receiver's personal room
      const receiverId = message.receiverId;
      this.server
        .to(`user:${receiverId}`)
        .emit('message_notification', {
          conversationId: message.conversationId,
          message,
        });

      this.logger.log(`Message created from ${userId} in conversation ${message.conversationId}`);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error creating message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle typing indicator
   */
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    try {
      const userId = client.data.userId;
      const { conversationId, isTyping } = data;

      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Broadcast typing status to conversation room (except sender)
      client.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        isTyping,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error handling typing indicator: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle marking messages as read
   */
  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = client.data.userId;
      const { conversationId } = data;

      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Mark messages as read
      await this.messagesService.markMessagesAsRead(userId, conversationId);

      // Notify other participants that messages were read
      client.to(`conversation:${conversationId}`).emit('messages_read', {
        conversationId,
        userId,
      });

      this.logger.log(`Messages marked as read by ${userId} in conversation ${conversationId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Error marking messages as read: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get online status for a user
   */
  isUserOnline(userId: string): boolean {
    return this.userSocketMap.has(userId) && (this.userSocketMap.get(userId)?.size ?? 0) > 0;
  }

  /**
   * Emit event to specific user
   */
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit event to conversation
   */
  emitToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }
}
