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
import { MessagingService } from '../services/messaging.service';
import { EncryptionService } from '../services/encryption.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RateLimit } from '../../../common/guards/rate-limit.guard';
import {
  CreateConversationDto,
  SendMessageDto,
  InitializeEncryptionDto,
  GetMessagesDto,
  MarkAsReadDto,
} from '../dto/messaging.dto';

@ApiTags('messaging')
@Controller('messaging')
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly encryptionService: EncryptionService,
  ) {}

  @Post('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @RateLimit({ requests: 10, windowMs: 60000 }) // 10 conversations per minute
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiBody({ type: CreateConversationDto })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
    schema: {
      type: 'object',
      properties: {
        conversationId: { type: 'string' },
        participants: { type: 'array', items: { type: 'string' } },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createConversation(@Body() createDto: CreateConversationDto, @Request() req) {
    // Ensure the requesting user is one of the participants
    const { participant1Id, participant2Id } = createDto;
    const userId = req.user.userId;

    if (userId !== participant1Id && userId !== participant2Id) {
      throw new Error('You can only create conversations for yourself');
    }

    const conversation = await this.messagingService.createConversation(createDto);
    return {
      conversationId: conversation.conversationId,
      participants: conversation.participants,
      createdAt: conversation.createdAt,
    };
  }

  @Post('encryption/initialize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Initialize encryption for a conversation' })
  @ApiBody({ type: InitializeEncryptionDto })
  @ApiResponse({
    status: 200,
    description: 'Encryption initialized successfully',
    schema: {
      type: 'object',
      properties: {
        conversationKey: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            algorithm: { type: 'string' },
          },
        },
        encryptedKeyShare: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async initializeEncryption(@Body() initDto: InitializeEncryptionDto, @Request() req) {
    const result = await this.messagingService.initializeConversationEncryption(
      initDto.conversationId,
      req.user.userId,
      initDto.publicKey,
    );

    return {
      conversationKey: {
        version: result.conversationKey.version,
        algorithm: result.conversationKey.algorithm,
      },
      encryptedKeyShare: result.encryptedKeyShare,
    };
  }

  @Post('messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @RateLimit({ requests: 30, windowMs: 60000 }) // 30 messages per minute
  @ApiOperation({ summary: 'Send a message' })
  @ApiBody({
    type: SendMessageDto,
    description: 'Message data including encrypted content',
  })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
    schema: {
      type: 'object',
      properties: {
        messageId: { type: 'string' },
        status: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a participant' })
  async sendMessage(@Body() sendDto: SendMessageDto, @Request() req) {
    // The conversation key should be provided in the request body or headers
    // For now, we'll assume it's passed as a header
    const conversationKey = req.headers['x-conversation-key'] as string;

    if (!conversationKey) {
      throw new Error('Conversation key is required');
    }

    const message = await this.messagingService.sendMessage(sendDto, req.user.userId, conversationKey);

    return {
      messageId: message._id,
      status: message.status,
      createdAt: message.createdAt,
    };
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user conversations' })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          conversationId: { type: 'string' },
          participants: { type: 'array', items: { type: 'string' } },
          lastMessageAt: { type: 'string', format: 'date-time' },
          lastMessagePreview: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConversations(@Request() req) {
    const conversations = await this.messagingService.getUserConversations(req.user.userId);
    return conversations.map(conv => ({
      conversationId: conv.conversationId,
      participants: conv.participants,
      lastMessageAt: conv.lastMessageAt,
      lastMessagePreview: conv.lastMessagePreview,
    }));
  }

  @Get('conversations/:conversationId/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiQuery({ name: 'page', description: 'Page number', required: false })
  @ApiQuery({ name: 'limit', description: 'Messages per page', required: false })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          senderId: { type: 'string' },
          recipientId: { type: 'string' },
          content: { type: 'string' },
          status: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query() query: GetMessagesDto,
    @Request() req,
  ) {
    const conversationKey = req.headers['x-conversation-key'] as string;

    if (!conversationKey) {
      throw new Error('Conversation key is required');
    }

    const messages = await this.messagingService.getConversationMessages(
      conversationId,
      req.user.userId,
      conversationKey,
      query.page,
      query.limit,
    );

    return messages;
  }

  @Put('conversations/:conversationId/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Messages marked as read successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a participant' })
  async markAsRead(@Param('conversationId') conversationId: string, @Request() req) {
    await this.messagingService.markMessagesAsRead(conversationId, req.user.userId);
    return { message: 'Messages marked as read' };
  }

  @Get('encryption/key/:conversationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get conversation encryption key' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Encryption key retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Key not found' })
  async getConversationKey(@Param('conversationId') conversationId: string, @Request() req) {
    // Private key should be provided in headers for decryption
    const privateKey = req.headers['x-private-key'] as string;

    if (!privateKey) {
      throw new Error('Private key is required');
    }

    const key = await this.messagingService.getConversationKey(
      conversationId,
      req.user.userId,
      privateKey,
    );

    return { key };
  }

  @Post('keys/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Generate new RSA key pair' })
  @ApiResponse({
    status: 200,
    description: 'Key pair generated successfully',
    schema: {
      type: 'object',
      properties: {
        publicKey: { type: 'string' },
        privateKey: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateKeyPair() {
    const keyPair = this.encryptionService.generateKeyPair();
    return keyPair;
  }

  @Delete('messages/:messageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({
    status: 200,
    description: 'Message deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the sender' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async deleteMessage(@Param('messageId') messageId: string, @Request() req) {
    await this.messagingService.deleteMessage(messageId, req.user.userId);
    return { message: 'Message deleted successfully' };
  }
}
