import { IsString, IsNumber, IsOptional, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMilestoneDto {
  @ApiProperty({ description: 'Contract ID' })
  @IsString()
  @IsNotEmpty()
  contractId: string;

  @ApiProperty({ description: 'Milestone title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Milestone description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Milestone amount', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Milestone order', minimum: 1 })
  @IsNumber()
  @Min(1)
  order: number;

  @ApiPropertyOptional({ description: 'Due date for milestone', type: Date })
  @IsOptional()
  @Type(() => Date)
  dueDate?: Date;
}
