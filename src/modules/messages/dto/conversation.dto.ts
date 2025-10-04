import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConversationParticipantDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  avatar?: string;

  @ApiProperty()
  role: string;
}

export class LastMessageDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  messageType: string;

  @ApiProperty()
  sentAt: Date;

  @ApiProperty()
  isRead: boolean;
}

export class ConversationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  contractId: string;

  @ApiPropertyOptional()
  milestoneId?: string;

  @ApiProperty({ type: ConversationParticipantDto })
  client: ConversationParticipantDto;

  @ApiProperty({ type: ConversationParticipantDto })
  freelancer: ConversationParticipantDto;

  @ApiPropertyOptional({ type: LastMessageDto })
  lastMessage?: LastMessageDto;

  @ApiPropertyOptional()
  lastMessageAt?: Date;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MessageSenderDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  avatar?: string;
}

export class MessageAttachmentResponseDto {
  @ApiProperty()
  filename: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  type: string;
}

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty({ type: MessageSenderDto })
  sender: MessageSenderDto;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  receiverId: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  messageType: string;

  @ApiPropertyOptional({ type: [MessageAttachmentResponseDto] })
  attachments?: MessageAttachmentResponseDto[];

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  isEdited: boolean;

  @ApiProperty()
  sentAt: Date;

  @ApiPropertyOptional()
  readAt?: Date;

  @ApiPropertyOptional()
  editedAt?: Date;
}

export class ConversationListResponseDto {
  @ApiProperty({ type: [ConversationResponseDto] })
  conversations: ConversationResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class MessageListResponseDto {
  @ApiProperty({ type: [MessageResponseDto] })
  messages: MessageResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  hasMore: boolean;
}
