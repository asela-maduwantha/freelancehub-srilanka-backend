import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional, Min } from 'class-validator';

export class SubmitProposalDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  bidAmount: number;

  @IsNotEmpty()
  @IsString()
  proposal: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  duration: number; // in days

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
