import { IsNotEmpty, IsString } from 'class-validator';

export class AddMessageDto {
  @IsNotEmpty()
  @IsString()
  message: string;
}
