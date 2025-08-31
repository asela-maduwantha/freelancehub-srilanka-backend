import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class SubmitMilestoneDto {
  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  files?: string[];
}
