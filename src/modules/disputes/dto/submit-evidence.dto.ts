import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class SubmitEvidenceDto {
  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  files?: string[];
}
