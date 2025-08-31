import { IsNotEmpty, IsString } from 'class-validator';

export class CancelContractDto {
  @IsNotEmpty()
  @IsString()
  reason: string;
}
