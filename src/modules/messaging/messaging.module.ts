import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagingController } from './controllers/messaging.controller';
import { MessagingService } from './services/messaging.service';
import { EncryptionService } from './services/encryption.service';
import { MessagingGateway } from './gateways/messaging.gateway';
import { NotificationService } from '../notifications/services/notification.service';
import {
  Conversation,
  ConversationSchema,
} from '../../schemas/conversation.schema';
import { Message, MessageSchema } from '../../schemas/message.schema';
import {
  EncryptionKey,
  EncryptionKeySchema,
} from '../../schemas/encryption-key.schema';
import { Notification, NotificationSchema } from '../../schemas/notification.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { EmailService } from '../../common/services/email.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: EncryptionKey.name, schema: EncryptionKeySchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
  ],
  controllers: [MessagingController],
  providers: [
    MessagingService,
    EncryptionService,
    MessagingGateway,
    NotificationService,
    EmailService,
  ],
  exports: [MessagingService, EncryptionService, MessagingGateway],
})
export class MessagingModule {}
