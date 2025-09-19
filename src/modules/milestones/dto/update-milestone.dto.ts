import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateMilestoneDto {
  @ApiPropertyOptional({ description: 'Milestone title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Milestone description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Milestone amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: 'Due date for milestone', type: Date })
  @IsOptional()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Milestone order', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  order?: number;
}
