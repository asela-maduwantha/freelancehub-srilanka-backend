import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveMilestoneDto {
  @ApiPropertyOptional({ description: 'Optional feedback for the milestone approval', example: 'Great work!' })
  @IsOptional()
  @IsString()
  feedback?: string;
}
