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
    description: 'Payment method ID to use for payment (for saved cards)',
    example: 'pm_1234567890',
  })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({
    description: 'Setup Intent ID for new card setup',
    example: 'seti_1234567890',
  })
  @IsOptional()
  @IsString()
  setupIntentId?: string;

  @ApiPropertyOptional({
    description: 'Whether to process payment immediately',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  processPayment?: boolean;
}
