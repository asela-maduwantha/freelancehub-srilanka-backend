import { IsString, IsObject } from 'class-validator';

export class StripeWebhookDto {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsObject()
  data: {
    object: any;
  };

  @IsString()
  signature?: string;
}