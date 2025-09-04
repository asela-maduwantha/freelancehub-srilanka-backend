import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from '../../../schemas/conversation.schema';
import { Message, MessageDocument } from '../../../schemas/message.schema';
import { EncryptionKey, EncryptionKeyDocument } from '../../../schemas/encryption-key.schema';
import { EncryptionService, ConversationKey, KeyPair } from './encryption.service';
import { NotFoundException, ForbiddenException } from '../../../common/exceptions';

export interface CreateConversationDto {
  participant1Id: string;
  participant2Id: string;
}

export interface SendMessageDto {
  conversationId: string;
  content: string;
  recipientId: string;
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  status: string;
  createdAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

@Injectable()
export class MessagingService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(EncryptionKey.name) private encryptionKeyModel: Model<EncryptionKeyDocument>,
    private encryptionService: EncryptionService,
  ) {}

  /**
   * Create a new conversation between two users
   */
  async createConversation(createDto: CreateConversationDto): Promise<ConversationDocument> {
    const { participant1Id, participant2Id } = createDto;

    // Check if conversation already exists
    const existingConversation = await this.conversationModel.findOne({
      $or: [
        { participant1: participant1Id, participant2: participant2Id },
        { participant1: participant2Id, participant2: participant1Id },
      ],
    });

    if (existingConversation) {
      return existingConversation;
    }

    // Generate unique conversation ID
    const conversationId = this.generateConversationId(participant1Id, participant2Id);

    // Create new conversation
    const conversation = new this.conversationModel({
      participant1: participant1Id,
      participant2: participant2Id,
      conversationId,
      participants: [participant1Id, participant2Id],
      metadata: {
        encryptionAlgorithm: 'aes-256-gcm',
        keyExchangeCompleted: false,
      },
    });

    return await conversation.save();
  }

  /**
   * Initialize encryption for a conversation
   */
  async initializeConversationEncryption(
    conversationId: string,
    userId: string,
    userPublicKey: string,
  ): Promise<{ conversationKey: ConversationKey; encryptedKeyShare: string }> {
    const conversation = await this.conversationModel.findOne({ conversationId });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify user is participant
    if (!conversation.participants.includes(new Types.ObjectId(userId))) {
      throw new ForbiddenException('User is not a participant in this conversation');
    }

    // Generate conversation key
    const conversationKey = this.encryptionService.generateConversationKey();

    // Encrypt the key share with user's public key
    const encryptedKeyShare = this.encryptionService.encryptKeyShare(
      conversationKey.key,
      userPublicKey,
    );

    // Store the encrypted key share
    await this.storeEncryptionKey(conversationId, userId, encryptedKeyShare, conversationKey.version);

    // Update conversation metadata
    await this.conversationModel.updateOne(
      { conversationId },
      {
        $set: {
          [`metadata.participant${conversation.participant1.toString() === userId ? '1' : '2'}PublicKey`]: userPublicKey,
        },
      },
    );

    return { conversationKey, encryptedKeyShare };
  }

  /**
   * Send an encrypted message
   */
  async sendMessage(
    sendDto: SendMessageDto,
    senderId: string,
    conversationKey: string,
  ): Promise<MessageDocument> {
    const { conversationId, content, recipientId } = sendDto;

    // Verify conversation exists and user is participant
    const conversation = await this.conversationModel.findOne({ conversationId });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.includes(new Types.ObjectId(senderId))) {
      throw new ForbiddenException('User is not a participant in this conversation');
    }

    // Encrypt the message
    const encryptedMessage = this.encryptionService.encryptMessage(content, conversationKey);

    // Create message document
    const message = new this.messageModel({
      conversationId: conversation._id,
      senderId,
      recipientId,
      encryptedContent: encryptedMessage.encryptedContent,
      iv: encryptedMessage.iv,
      messageHash: encryptedMessage.messageHash,
      status: 'sent',
      metadata: {
        encryptionAlgorithm: 'aes-256-gcm',
        messageType: 'text',
      },
    });

    const savedMessage = await message.save();

    // Update conversation's last message info
    await this.conversationModel.updateOne(
      { conversationId },
      {
        $set: {
          lastMessageAt: new Date(),
          lastMessagePreview: content.substring(0, 100),
        },
      },
    );

    return savedMessage;
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(
    conversationId: string,
    userId: string,
    conversationKey: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<MessageResponse[]> {
    // Verify user is participant
    const conversation = await this.conversationModel.findOne({ conversationId });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.includes(new Types.ObjectId(userId))) {
      throw new ForbiddenException('User is not a participant in this conversation');
    }

    // Get messages
    const messages = await this.messageModel
      .find({ conversationId: conversation._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('senderId', 'firstName lastName profilePicture')
      .populate('recipientId', 'firstName lastName profilePicture');

    // Decrypt messages
    const decryptedMessages: MessageResponse[] = [];
    for (const message of messages) {
      try {
        const decryptedContent = this.encryptionService.decryptMessage(
          {
            encryptedContent: message.encryptedContent,
            iv: message.iv,
            messageHash: message.messageHash,
          },
          conversationKey,
        );

        decryptedMessages.push({
          id: (message._id as any).toString(),
          conversationId: message.conversationId.toString(),
          senderId: message.senderId.toString(),
          recipientId: message.recipientId.toString(),
          content: decryptedContent,
          status: message.status,
          createdAt: message.createdAt || new Date(),
          deliveredAt: message.deliveredAt,
          readAt: message.readAt,
        });
      } catch (error) {
        // If decryption fails, skip this message
        console.error(`Failed to decrypt message ${message._id}:`, error);
      }
    }

    return decryptedMessages.reverse(); // Return in chronological order
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(userId: string): Promise<ConversationDocument[]> {
    return await this.conversationModel
      .find({
        participants: new Types.ObjectId(userId),
        isActive: true,
      })
      .sort({ lastMessageAt: -1 })
      .populate('participant1', 'firstName lastName profilePicture')
      .populate('participant2', 'firstName lastName profilePicture');
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await this.messageModel.updateMany(
      {
        conversationId,
        recipientId: userId,
        status: { $ne: 'read' },
      },
      {
        $set: {
          status: 'read',
          readAt: new Date(),
        },
      },
    );
  }

  /**
   * Get conversation encryption key for a user
   */
  async getConversationKey(conversationId: string, userId: string, privateKey: string): Promise<string> {
    const encryptionKey = await this.encryptionKeyModel.findOne({
      conversationId,
      ownerId: userId,
      isActive: true,
    });

    if (!encryptionKey) {
      throw new NotFoundException('Encryption key not found');
    }

    // Decrypt the key share
    const keyShare = this.encryptionService.decryptKeyShare(
      encryptionKey.encryptedKeyShare,
      privateKey,
    );

    return keyShare;
  }

  /**
   * Store encryption key share
   */
  private async storeEncryptionKey(
    conversationId: string,
    userId: string,
    encryptedKeyShare: string,
    keyVersion: string,
  ): Promise<void> {
    const conversation = await this.conversationModel.findOne({ conversationId });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const encryptionKey = new this.encryptionKeyModel({
      conversationId: conversation._id,
      ownerId: userId,
      encryptedKeyShare,
      keyVersion,
      metadata: {
        algorithm: 'aes-256-gcm',
        keyLength: 256,
      },
    });

    await encryptionKey.save();
  }

  /**
   * Generate unique conversation ID
   */
  private generateConversationId(participant1Id: string, participant2Id: string): string {
    const [id1, id2] = [participant1Id, participant2Id].sort();
    return `conv_${id1}_${id2}`;
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('Can only delete own messages');
    }

    await this.messageModel.updateOne(
      { _id: messageId },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
    );
  }
}
