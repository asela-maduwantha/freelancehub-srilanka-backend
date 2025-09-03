export * from './messaging.module';
export * from './controllers/messaging.controller';
export * from './services/encryption.service';
export * from './schemas/conversation.schema';
export * from './schemas/message.schema';
export * from './schemas/encryption-key.schema';
export * from './dto/messaging.dto';

// Re-export messaging service without DTO conflicts
export { MessagingService } from './services/messaging.service';
