import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractStatus } from '../../../common/enums/contract-status.enum';

export class UpdateContractStatusDto {
  @ApiProperty({
    description: 'New contract status',
    enum: ContractStatus
  })
  @IsEnum(ContractStatus)
  status: ContractStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsOptional()
  @IsString()
  reason?: string;
}