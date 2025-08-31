import { IsNotEmpty, IsEnum } from 'class-validator';

export class UpdateDisputeStatusDto {
  @IsNotEmpty()
  @IsEnum(['open', 'under-review', 'resolved', 'closed'])
  status: 'open' | 'under-review' | 'resolved' | 'closed';
}
