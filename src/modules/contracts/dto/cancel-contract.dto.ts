import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelContractDto {
  @ApiProperty({ description: 'The reason for canceling the contract', example: 'Project requirements changed' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}
