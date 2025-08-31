import { IsOptional, IsString } from 'class-validator';

export class ApproveMilestoneDto {
  @IsOptional()
  @IsString()
  feedback?: string;
}
