import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveMilestoneDto {
  @ApiPropertyOptional({
    description: 'Optional feedback for the milestone approval',
    example: 'Great work!',
  })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional({
    description: 'Payment method ID to use for payment',
    example: 'pm_1234567890',
  })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({
    description: 'Whether to process payment immediately',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  processPayment?: boolean;
}
