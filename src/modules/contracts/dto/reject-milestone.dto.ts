import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class RejectMilestoneDto {
  @IsNotEmpty()
  @IsString()
  feedback: string;

  @IsOptional()
  @IsString()
  revisionRequest?: string;
}
