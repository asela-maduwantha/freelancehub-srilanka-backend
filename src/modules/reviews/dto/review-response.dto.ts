import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message?: string;

  @ApiProperty()
  data: any;
}

export class ReviewListResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: {
    reviews: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export class ReviewStatsResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: {
    revieweeId: string;
    totalReviews: number;
    averageRating: number;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
    categoryAverages?: {
      communication?: number;
      quality?: number;
      timeliness?: number;
      professionalism?: number;
    };
  };
}