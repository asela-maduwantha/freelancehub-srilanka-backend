import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDate,
  IsArray,
  IsNotEmpty,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MilestoneStatus } from '../../../common/enums/milestone-status.enum';
import { CreateDeliverableDto } from '../../contracts/dto/create-deliverable.dto';

export class AddMilestoneDto {
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

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Milestone order', minimum: 1 })
  @IsNumber()
  @Min(1)
  order: number;

  @ApiPropertyOptional({ description: 'Due date for milestone', type: Date })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional({
    description: 'Initial milestone status',
    enum: MilestoneStatus,
    default: MilestoneStatus.PENDING
  })
  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @ApiPropertyOptional({
    description: 'Initial deliverables',
    type: [CreateDeliverableDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDeliverableDto)
  deliverables?: CreateDeliverableDto[];

  @ApiPropertyOptional({ description: 'Submission note' })
  @IsOptional()
  @IsString()
  submissionNote?: string;
}