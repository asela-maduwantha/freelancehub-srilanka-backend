import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export class ResolveDisputeDto {
  @IsNotEmpty()
  @IsString()
  decision: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;
}
