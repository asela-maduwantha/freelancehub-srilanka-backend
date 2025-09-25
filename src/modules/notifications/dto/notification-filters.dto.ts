import { IsOptional, IsEnum, IsBoolean, IsNumber, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '../../../common/enums/notification-type.enum';

export class NotificationFilters {
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isRead?: boolean;

  @IsOptional()
  @IsString()
  relatedType?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}