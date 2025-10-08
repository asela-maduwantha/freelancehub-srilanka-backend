import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from '../../database/schemas/message.schema';
import { Conversation } from '../../database/schemas/conversation.schema';
import { Contract } from '../../database/schemas/contract.schema';
import { User } from '../../database/schemas/user.schema';
import { Milestone } from '../../database/schemas/milestone.schema';
import { UserRole } from '../../common/enums/user-role.enum';
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

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Milestone.name) private milestoneModel: Model<Milestone>,
  ) {}

  /**
   * Find or create a conversation for a contract (and optionally a milestone)
   */
  async findOrCreateConversation(
    contractId: string,
    milestoneId?: string,
  ): Promise<Conversation> {
    try {
      // Validate contract exists
      const contract = await this.contractModel.findById(contractId);
      if (!contract) {
        throw new NotFoundException('Contract not found');
      }

      // Validate milestone if provided
      if (milestoneId) {
        const milestone = await this.milestoneModel.findOne({
          _id: milestoneId,
          contractId: new Types.ObjectId(contractId),
        });
        if (!milestone) {
          throw new NotFoundException('Milestone not found or does not belong to this contract');
        }
      }

      // Find existing conversation
      const query: any = { contractId: new Types.ObjectId(contractId) };
      if (milestoneId) {
        query.milestoneId = new Types.ObjectId(milestoneId);
      } else {
        query.milestoneId = { $exists: false };
      }

      let conversation = await this.conversationModel.findOne(query);

      // Create new conversation if not exists
      if (!conversation) {
        conversation = await this.conversationModel.create({
          contractId: contract._id,
          milestoneId: milestoneId ? new Types.ObjectId(milestoneId) : undefined,
          clientId: contract.clientId,
          freelancerId: contract.freelancerId,
          isActive: true,
        });
        this.logger.log(`Created new conversation: ${conversation._id}`);
      }

      return conversation;
    } catch (error) {
      this.logger.error(`Error finding/creating conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create and send a new message
   */
  async createMessage(
    userId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    try {
      const { contractId, milestoneId, content, messageType, attachments, receiverId } = createMessageDto;

      // Find or create conversation
      const conversation = await this.findOrCreateConversation(contractId, milestoneId);

      // Get user to check role
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Validate user is part of the conversation or is an admin
      const isClient = conversation.clientId.toString() === userId;
      const isFreelancer = conversation.freelancerId.toString() === userId;
      const isAdmin = user.role === UserRole.ADMIN;

      if (!isClient && !isFreelancer && !isAdmin) {
        throw new ForbiddenException('You are not part of this conversation');
      }

      // Determine sender and receiver
      const senderId = new Types.ObjectId(userId);
      let receiverIdObj: Types.ObjectId;

      if (isAdmin && receiverId) {
        // For admins, use the specified receiver if provided
        receiverIdObj = new Types.ObjectId(receiverId);
        // Validate that the receiver is part of this conversation
        if (receiverId !== conversation.clientId.toString() && receiverId !== conversation.freelancerId.toString()) {
          throw new BadRequestException('Receiver must be part of this conversation');
        }
      } else {
        // For regular users, determine receiver based on sender
        receiverIdObj = isClient ? conversation.freelancerId : conversation.clientId;
      }

      // Create the message
      const message = await this.messageModel.create({
        conversationId: (conversation._id as Types.ObjectId).toString(),
        senderId,
        receiverId: receiverIdObj,
        content,
        messageType: messageType || 'text',
        attachments: attachments || [],
        isRead: false,
        sentAt: new Date(),
      });

      // Update conversation
      conversation.lastMessageId = message._id as Types.ObjectId;
      conversation.lastMessageAt = message.sentAt;
      
      // Increment unread count for receiver
      if (receiverIdObj.equals(conversation.clientId)) {
        conversation.unreadCountClient++;
      } else if (receiverIdObj.equals(conversation.freelancerId)) {
        conversation.unreadCountFreelancer++;
      }

      await conversation.save();

      this.logger.log(`Message created: ${message._id} in conversation: ${conversation._id}`);

      // Return formatted message
      return this.formatMessage(message);
    } catch (error) {
      this.logger.error(`Error creating message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send a message in an existing conversation
   */
  async sendMessage(
    userId: string,
    sendMessageDto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    try {
      const { conversationId, content, messageType, attachments } = sendMessageDto;

      // Find conversation
      const conversation = await this.conversationModel.findById(conversationId);
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      // Validate user is part of the conversation
      const isClient = conversation.clientId.toString() === userId;
      const isFreelancer = conversation.freelancerId.toString() === userId;

      if (!isClient && !isFreelancer) {
        throw new ForbiddenException('You are not part of this conversation');
      }

      // Determine sender and receiver
      const senderId = new Types.ObjectId(userId);
      const receiverId = isClient ? conversation.freelancerId : conversation.clientId;

      // Create the message
      const message = await this.messageModel.create({
        conversationId: (conversation._id as Types.ObjectId).toString(),
        senderId,
        receiverId,
        content,
        messageType: messageType || 'text',
        attachments: attachments || [],
        isRead: false,
        sentAt: new Date(),
      });

      // Update conversation
      conversation.lastMessageId = message._id as Types.ObjectId;
      conversation.lastMessageAt = message.sentAt;
      
      // Increment unread count for receiver
      if (isClient) {
        conversation.unreadCountFreelancer++;
      } else {
        conversation.unreadCountClient++;
      }

      await conversation.save();

      this.logger.log(`Message sent: ${message._id} in conversation: ${conversation._id}`);

      // Return formatted message
      return this.formatMessage(message);
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(
    userId: string,
    query: GetConversationsQueryDto,
  ): Promise<ConversationListResponseDto> {
    try {
      const { page = 1, limit = 20, contractId, includeArchived = false } = query;
      const skip = (page - 1) * limit;

      // Build query
      const filter: any = {
        $or: [
          { clientId: new Types.ObjectId(userId) },
          { freelancerId: new Types.ObjectId(userId) },
        ],
        deletedAt: { $exists: false },
      };

      if (contractId) {
        filter.contractId = new Types.ObjectId(contractId);
      }

      if (!includeArchived) {
        filter.$and = [
          {
            $or: [
              { clientId: new Types.ObjectId(userId), isArchivedByClient: false },
              { freelancerId: new Types.ObjectId(userId), isArchivedByFreelancer: false },
            ],
          },
        ];
      }

      // Get conversations
      const [conversations, total] = await Promise.all([
        this.conversationModel
          .find(filter)
          .sort({ lastMessageAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('clientId', 'profile')
          .populate('freelancerId', 'profile')
          .populate('lastMessageId')
          .lean()
          .exec(),
        this.conversationModel.countDocuments(filter),
      ]);

      // Format conversations
      const formattedConversations = await Promise.all(
        conversations.map((conv) => this.formatConversation(conv, userId)),
      );

      return {
        conversations: formattedConversations,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Error getting conversations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    userId: string,
    conversationId: string,
    query: GetMessagesQueryDto,
  ): Promise<MessageListResponseDto> {
    try {
      const { page = 1, limit = 50, before } = query;
      const skip = (page - 1) * limit;

      // Validate conversation and user access
      const conversation = await this.conversationModel.findById(conversationId);
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      const isClient = conversation.clientId.toString() === userId;
      const isFreelancer = conversation.freelancerId.toString() === userId;

      if (!isClient && !isFreelancer) {
        throw new ForbiddenException('You are not part of this conversation');
      }

      // Build query
      const filter: any = {
        conversationId: conversationId,
        isDeleted: false,
      };

      if (before) {
        const beforeMessage = await this.messageModel.findById(before);
        if (beforeMessage) {
          filter.sentAt = { $lt: beforeMessage.sentAt };
        }
      }

      // Get messages
      const [messages, total] = await Promise.all([
        this.messageModel
          .find(filter)
          .sort({ sentAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('senderId', 'profile')
          .lean()
          .exec(),
        this.messageModel.countDocuments(filter),
      ]);

      // Format messages
      const formattedMessages = messages.map((msg) => this.formatMessage(msg));

      return {
        messages: formattedMessages,
        total,
        page,
        limit,
        hasMore: skip + messages.length < total,
      };
    } catch (error) {
      this.logger.error(`Error getting messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(userId: string, conversationId: string): Promise<void> {
    try {
      // Validate conversation and user access
      const conversation = await this.conversationModel.findById(conversationId);
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      const isClient = conversation.clientId.toString() === userId;
      const isFreelancer = conversation.freelancerId.toString() === userId;

      if (!isClient && !isFreelancer) {
        throw new ForbiddenException('You are not part of this conversation');
      }

      // Mark messages as read
      await this.messageModel.updateMany(
        {
          conversationId: conversationId,
          receiverId: new Types.ObjectId(userId),
          isRead: false,
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        },
      );

      // Reset unread count in conversation
      if (isClient) {
        conversation.unreadCountClient = 0;
      } else {
        conversation.unreadCountFreelancer = 0;
      }

      await conversation.save();

      this.logger.log(`Marked messages as read for user ${userId} in conversation ${conversationId}`);
    } catch (error) {
      this.logger.error(`Error marking messages as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(
    userId: string,
    conversationId: string,
  ): Promise<ConversationResponseDto> {
    try {
      const conversation = await this.conversationModel
        .findById(conversationId)
        .populate('clientId', 'profile')
        .populate('freelancerId', 'profile')
        .populate('lastMessageId')
        .lean()
        .exec();

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      // Validate user access
      const isClient = conversation.clientId._id.toString() === userId;
      const isFreelancer = conversation.freelancerId._id.toString() === userId;

      if (!isClient && !isFreelancer) {
        throw new ForbiddenException('You are not part of this conversation');
      }

      return this.formatConversation(conversation, userId);
    } catch (error) {
      this.logger.error(`Error getting conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format conversation for response
   */
  private formatConversation(conversation: any, userId: string): ConversationResponseDto {
    const isClient = conversation.clientId._id?.toString() === userId || conversation.clientId.toString() === userId;

    return {
      id: conversation._id.toString(),
      contractId: conversation.contractId.toString(),
      milestoneId: conversation.milestoneId?.toString(),
      client: {
        id: conversation.clientId._id?.toString() || conversation.clientId.toString(),
        firstName: conversation.clientId.profile?.firstName || 'Client',
        lastName: conversation.clientId.profile?.lastName || 'User',
        avatar: conversation.clientId.profile?.avatar,
        role: 'client',
      },
      freelancer: {
        id: conversation.freelancerId._id?.toString() || conversation.freelancerId.toString(),
        firstName: conversation.freelancerId.profile?.firstName || 'Freelancer',
        lastName: conversation.freelancerId.profile?.lastName || 'User',
        avatar: conversation.freelancerId.profile?.avatar,
        role: 'freelancer',
      },
      lastMessage: conversation.lastMessageId
        ? {
            id: conversation.lastMessageId._id?.toString() || conversation.lastMessageId.toString(),
            content: conversation.lastMessageId.content || '',
            senderId: conversation.lastMessageId.senderId?.toString() || '',
            messageType: conversation.lastMessageId.messageType || 'text',
            sentAt: conversation.lastMessageId.sentAt || new Date(),
            isRead: conversation.lastMessageId.isRead || false,
          }
        : undefined,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: isClient ? conversation.unreadCountClient : conversation.unreadCountFreelancer,
      isActive: conversation.isActive,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  /**
   * Format message for response
   */
  private formatMessage(message: any): MessageResponseDto {
    const sender = message.senderId;
    
    return {
      id: message._id.toString(),
      conversationId: message.conversationId,
      sender: {
        id: sender._id?.toString() || sender.toString(),
        firstName: sender.profile?.firstName || 'User',
        lastName: sender.profile?.lastName || '',
        avatar: sender.profile?.avatar,
      },
      senderId: sender._id?.toString() || sender.toString(),
      receiverId: message.receiverId?.toString() || message.receiverId,
      content: message.content,
      messageType: message.messageType,
      attachments: message.attachments || [],
      isRead: message.isRead,
      isEdited: message.isEdited,
      sentAt: message.sentAt,
      readAt: message.readAt,
      editedAt: message.editedAt,
    };
  }
}
