import { IsArray, IsOptional, IsString, IsNotEmpty, ValidateNested, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateDeliverableDto } from '../../contracts/dto/create-deliverable.dto';

export class SubmitMilestoneDto {
  @ApiProperty({ description: 'Deliverables', type: [CreateDeliverableDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDeliverableDto)
  deliverables: CreateDeliverableDto[];

  @ApiPropertyOptional({ description: 'Submission note' })
  @IsOptional()
  @IsString()
  submissionNote?: string;
}
