import { IsArray, IsOptional, IsMongoId } from 'class-validator';

export class MarkReadDto {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  notificationIds?: string[];

  @IsOptional()
  @IsMongoId()
  notificationId?: string;
}