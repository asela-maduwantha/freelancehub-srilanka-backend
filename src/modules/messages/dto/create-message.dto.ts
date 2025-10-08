import { IsString, IsNotEmpty, IsOptional, IsMongoId, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageAttachmentDto {
  @ApiProperty({ description: 'Filename of the attachment' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ description: 'URL of the attachment' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: 'Size of the attachment in bytes' })
  @IsNotEmpty()
  size: number;

  @ApiProperty({ description: 'MIME type of the attachment' })
  @IsString()
  @IsNotEmpty()
  type: string;
}

export class CreateMessageDto {
  @ApiProperty({ description: 'Contract ID for the conversation' })
  @IsMongoId()
  @IsNotEmpty()
  contractId: string;

  @ApiPropertyOptional({ description: 'Optional milestone ID if message is related to a specific milestone' })
  @IsMongoId()
  @IsOptional()
  milestoneId?: string;

  @ApiPropertyOptional({ description: 'Receiver user ID (required for admins sending messages)' })
  @IsMongoId()
  @IsOptional()
  receiverId?: string;

  @ApiProperty({ description: 'Message content', maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, { message: 'Message content cannot exceed 5000 characters' })
  content: string;

  @ApiPropertyOptional({ description: 'Message type', enum: ['text', 'file', 'system'], default: 'text' })
  @IsString()
  @IsOptional()
  messageType?: string;

  @ApiPropertyOptional({ description: 'Array of file attachments', type: [MessageAttachmentDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];
}

export class SendMessageDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsMongoId()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({ description: 'Message content', maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, { message: 'Message content cannot exceed 5000 characters' })
  content: string;

  @ApiPropertyOptional({ description: 'Message type', enum: ['text', 'file'], default: 'text' })
  @IsString()
  @IsOptional()
  messageType?: string;

  @ApiPropertyOptional({ description: 'Array of file attachments', type: [MessageAttachmentDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];
}

export class GetConversationsQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by contract ID' })
  @IsMongoId()
  @IsOptional()
  contractId?: string;

  @ApiPropertyOptional({ description: 'Include archived conversations', default: false })
  @IsOptional()
  includeArchived?: boolean;
}

export class GetMessagesQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 50 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Get messages before this message ID (for pagination)' })
  @IsMongoId()
  @IsOptional()
  before?: string;
}

export class MarkAsReadDto {
  @ApiProperty({ description: 'Array of message IDs to mark as read' })
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  messageIds: string[];
}
