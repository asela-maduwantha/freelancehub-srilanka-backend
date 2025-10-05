import { IsNotEmpty, IsString, IsOptional, IsEnum, IsUrl, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStripeAccountDto {
  @ApiProperty({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'US',
  })
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiPropertyOptional({
    description: 'Type of Stripe account',
    enum: ['express', 'standard'],
    default: 'express',
  })
  @IsOptional()
  @IsEnum(['express', 'standard'])
  type?: 'express' | 'standard';
}

export class CreateAccountLinkDto {
  @ApiProperty({
    description: 'URL to redirect to if onboarding fails',
    example: 'http://localhost:3000/onboarding/refresh',
  })
  @IsNotEmpty()
  @Matches(/^https?:\/\/.+$/, {
    message: 'refreshUrl must be a valid URL starting with http:// or https://'
  })
  refreshUrl: string;

  @ApiProperty({
    description: 'URL to redirect to after onboarding completes',
    example: 'http://localhost:3000/onboarding/complete',
  })
  @IsNotEmpty()
  @Matches(/^https?:\/\/.+$/, {
    message: 'returnUrl must be a valid URL starting with http:// or https://'
  })
  returnUrl: string;

  @ApiPropertyOptional({
    description: 'Type of account link',
    enum: ['account_onboarding', 'account_update'],
    default: 'account_onboarding',
  })
  @IsOptional()
  @IsEnum(['account_onboarding', 'account_update'])
  type?: 'account_onboarding' | 'account_update';
}

export class StripeAccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  country: string;

  @ApiProperty()
  chargesEnabled: boolean;

  @ApiProperty()
  payoutsEnabled: boolean;

  @ApiProperty()
  detailsSubmitted: boolean;

  @ApiProperty()
  type: string;

  @ApiProperty()
  created: number;
}

export class AccountLinkResponseDto {
  @ApiProperty({
    description: 'URL for user to complete onboarding',
  })
  url: string;

  @ApiProperty({
    description: 'Link expiration timestamp',
  })
  expiresAt: number;
}

export class StripeAccountStatusDto {
  @ApiProperty()
  hasAccount: boolean;

  @ApiProperty({ required: false })
  accountId?: string;

  @ApiProperty({ required: false })
  chargesEnabled?: boolean;

  @ApiProperty({ required: false })
  payoutsEnabled?: boolean;

  @ApiProperty({ required: false })
  detailsSubmitted?: boolean;

  @ApiProperty({ required: false })
  requirements?: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    pendingVerification: string[];
  };
}
