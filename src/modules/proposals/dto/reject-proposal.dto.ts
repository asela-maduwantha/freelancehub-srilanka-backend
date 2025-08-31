import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class RejectProposalDto {
  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  message?: string;
}
