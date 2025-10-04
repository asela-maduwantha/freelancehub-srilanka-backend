import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
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
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateMessageDto,
  SendMessageDto,
  GetConversationsQueryDto,
  GetMessagesQueryDto,
  ConversationResponseDto,
  MessageResponseDto,
  ConversationListResponseDto,
  MessageListResponseDto,
} from './dto';
import { StandardResponseDto } from '../../common/dto/response.dto';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new message in a contract/milestone conversation' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Message created successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized to send message in this conversation' })
  async createMessage(
    @CurrentUser('sub') userId: string,
    @Body() createMessageDto: CreateMessageDto,
  ): Promise<StandardResponseDto<MessageResponseDto>> {
    const message = await this.messagesService.createMessage(userId, createMessageDto);
    return StandardResponseDto.success(message, 'Message created successfully', HttpStatus.CREATED);
  }

  @Get('conversations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all conversations for the current user' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'contractId', required: false, type: String, description: 'Filter by contract ID' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean, description: 'Include archived conversations' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversations retrieved successfully',
    type: ConversationListResponseDto,
  })
  async getConversations(
    @CurrentUser('sub') userId: string,
    @Query() query: GetConversationsQueryDto,
  ): Promise<StandardResponseDto<ConversationListResponseDto>> {
    const conversations = await this.messagesService.getConversations(userId, query);
    return StandardResponseDto.success(conversations, 'Conversations retrieved successfully', HttpStatus.OK);
  }

  @Get('conversations/:conversationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a specific conversation by ID' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversation retrieved successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized to access this conversation' })
  async getConversation(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
  ): Promise<StandardResponseDto<ConversationResponseDto>> {
    const conversation = await this.messagesService.getConversationById(userId, conversationId);
    return StandardResponseDto.success(conversation, 'Conversation retrieved successfully', HttpStatus.OK);
  }

  @Get('conversations/:conversationId/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'before', required: false, type: String, description: 'Get messages before this message ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Messages retrieved successfully',
    type: MessageListResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized to access this conversation' })
  async getMessages(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @Query() query: GetMessagesQueryDto,
  ): Promise<StandardResponseDto<MessageListResponseDto>> {
    const messages = await this.messagesService.getMessages(userId, conversationId, query);
    return StandardResponseDto.success(messages, 'Messages retrieved successfully', HttpStatus.OK);
  }

  @Patch('conversations/:conversationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Messages marked as read successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized to access this conversation' })
  async markAsRead(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
  ): Promise<StandardResponseDto<null>> {
    await this.messagesService.markMessagesAsRead(userId, conversationId);
    return StandardResponseDto.success(null, 'Messages marked as read successfully', HttpStatus.OK);
  }

  @Post('conversations/:conversationId/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message in an existing conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Message sent successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized to send message in this conversation' })
  async sendMessage(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: Omit<SendMessageDto, 'conversationId'>,
  ): Promise<StandardResponseDto<MessageResponseDto>> {
    const sendMessageDto: SendMessageDto = {
      conversationId,
      ...body,
    };
    const message = await this.messagesService.sendMessage(userId, sendMessageDto);
    return StandardResponseDto.success(message, 'Message sent successfully', HttpStatus.CREATED);
  }
}
