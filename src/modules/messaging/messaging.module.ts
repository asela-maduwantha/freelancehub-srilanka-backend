import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagingController } from './controllers/messaging.controller';
import { MessagingService } from './services/messaging.service';
import { EncryptionService } from './services/encryption.service';
import { Conversation, ConversationSchema } from '../../schemas/conversation.schema';
import { Message, MessageSchema } from '../../schemas/message.schema';
import { EncryptionKey, EncryptionKeySchema } from '../../schemas/encryption-key.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: EncryptionKey.name, schema: EncryptionKeySchema },
    ]),
  ],
  controllers: [MessagingController],
  providers: [MessagingService, EncryptionService],
  exports: [MessagingService, EncryptionService],
})
export class MessagingModule {}
