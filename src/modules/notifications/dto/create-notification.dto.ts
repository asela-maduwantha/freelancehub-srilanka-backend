import { IsString, IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { NotificationType } from '../../../common/enums/notification-type.enum';

export class CreateNotificationDto {
  @IsMongoId()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsMongoId()
  relatedId?: string;

  @IsOptional()
  @IsString()
  relatedType?: string;
}