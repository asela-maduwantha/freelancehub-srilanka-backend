import { IsOptional, IsString } from 'class-validator';

export class AcceptProposalDto {
  @IsOptional()
  @IsString()
  message?: string;
}
