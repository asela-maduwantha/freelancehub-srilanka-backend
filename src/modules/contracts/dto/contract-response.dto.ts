import { ApiProperty } from '@nestjs/swagger';

export class ContractResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message?: string;

  @ApiProperty()
  data: any;
}

export class ContractListResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: {
    contracts: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}