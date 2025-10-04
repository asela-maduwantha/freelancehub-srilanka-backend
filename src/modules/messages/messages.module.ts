import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';

import { Message, MessageSchema } from '../../database/schemas/message.schema';
import { Conversation, ConversationSchema } from '../../database/schemas/conversation.schema';
import { Contract, ContractSchema } from '../../database/schemas/contract.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Milestone, MilestoneSchema } from '../../database/schemas/milestone.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: User.name, schema: UserSchema },
      { name: Milestone.name, schema: MilestoneSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION') || configService.get<string>('jwt.expiresIn') || '7d',
        },
      }),
    }),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
  exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
