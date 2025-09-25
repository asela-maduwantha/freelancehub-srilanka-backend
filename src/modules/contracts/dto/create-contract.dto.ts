import {
  IsString,
  IsOptional,
  IsDate,
  IsMongoId,
  IsNotEmpty,
  MinDate,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
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
  @Transform(({ value }) => {
    const date = new Date(value);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    if (date < tomorrow) {
      throw new Error('Start date must be at least tomorrow');
    }
    return date;
  })
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
