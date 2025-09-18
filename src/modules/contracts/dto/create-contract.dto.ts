import {
  IsString,
  IsOptional,
  IsDate,
  IsMongoId,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Create Contract DTO
export class CreateContractDto {
  @ApiProperty({ description: 'Proposal ID to create contract from' })
  @IsMongoId()
  @IsNotEmpty()
  proposalId: string;

  @ApiProperty({ description: 'Contract start date', type: Date })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ description: 'Contract end date', type: Date })
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @ApiPropertyOptional({ description: 'Contract terms and conditions' })
  @IsOptional()
  @IsString()
  terms?: string;
}
