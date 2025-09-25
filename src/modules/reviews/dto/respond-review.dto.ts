import { IsNotEmpty, IsString } from 'class-validator';

export class RespondReviewDto {
  @IsNotEmpty()
  @IsString()
  response: string;
}