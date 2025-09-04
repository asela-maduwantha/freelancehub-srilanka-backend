import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description: 'ID of the first participant',
    example: '60f1b2b3c4d5e6f7g8h9i0j1',
  })
  @IsString()
  @IsNotEmpty()
  participant1Id: string;

  @ApiProperty({
    description: 'ID of the second participant',
    example: '60f1b2b3c4d5e6f7g8h9i0j2',
  })
  @IsString()
  @IsNotEmpty()
  participant2Id: string;
}

export class SendMessageDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: 'conv_60f1b2b3c4d5e6f7g8h9i0j1_60f1b2b3c4d5e6f7g8h9i0j2',
  })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, how are you?',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Recipient user ID',
    example: '60f1b2b3c4d5e6f7g8h9i0j2',
  })
  @IsString()
  @IsNotEmpty()
  recipientId: string;
}

export class InitializeEncryptionDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: 'conv_60f1b2b3c4d5e6f7g8h9i0j1_60f1b2b3c4d5e6f7g8h9i0j2',
  })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({
    description: "User's public key in PEM format",
    example:
      '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----',
  })
  @IsString()
  @IsNotEmpty()
  publicKey: string;
}

export class GetMessagesDto {
  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
  })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Number of messages per page',
    example: 50,
    required: false,
  })
  @IsOptional()
  limit?: number = 50;
}

export class MarkAsReadDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: 'conv_60f1b2b3c4d5e6f7g8h9i0j1_60f1b2b3c4d5e6f7g8h9i0j2',
  })
  @IsString()
  @IsNotEmpty()
  conversationId: string;
}
