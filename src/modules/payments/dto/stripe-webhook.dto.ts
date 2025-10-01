import { IsString, IsObject, IsOptional } from 'class-validator';

export class StripeWebhookDto {
  @IsString()
  id: string;

  @IsString()
  object: string;

  @IsString()
  @IsOptional()
  api_version?: string;

  @IsOptional()
  created?: number;

  @IsObject()
  data: {
    object: any;
    [key: string]: any;
  };

  @IsOptional()
  livemode?: boolean;

  @IsOptional()
  pending_webhooks?: number;

  @IsObject()
  @IsOptional()
  request?: any;

  @IsString()
  type: string;
}