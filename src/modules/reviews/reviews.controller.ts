import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Throttle } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import {
  CreateReviewDto,
  RespondReviewDto,
  ReviewQueryDto,
  ReviewResponseDto,
  ReviewListResponseDto,
  ReviewStatsResponseDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 reviews per hour
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new review for a completed contract' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Review created successfully',
    type: ReviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid data or contract not eligible for review',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Unauthorized to review this contract',
  })
  async createReview(
    @Body(ValidationPipe) createReviewDto: CreateReviewDto,
    @CurrentUser('id') reviewerId: string,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.create(createReviewDto, reviewerId);
    return {
      success: true,
      message: 'Review created successfully',
      data: review,
    };
  }

  @Put(':id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Respond to a review (reviewee only)' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review response added successfully',
    type: ReviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Unauthorized to respond to this review',
  })
  async respondToReview(
    @Param('id') reviewId: string,
    @Body(ValidationPipe) respondDto: RespondReviewDto,
    @CurrentUser('id') userId: string,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.respondToReview(reviewId, respondDto, userId);
    return {
      success: true,
      message: 'Review response added successfully',
      data: review,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get review by ID' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review retrieved successfully',
    type: ReviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found',
  })
  async getReviewById(@Param('id') reviewId: string): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.findById(reviewId);
    return {
      success: true,
      message: 'Review retrieved successfully',
      data: review,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get reviews with optional filters' })
  @ApiQuery({ type: ReviewQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reviews retrieved successfully',
    type: ReviewListResponseDto,
  })
  async getReviews(
    @Query(new ValidationPipe({ transform: true })) query: ReviewQueryDto,
    @CurrentUser('id') userId: string,
  ): Promise<ReviewListResponseDto> {
    let result;

    if (query.revieweeId) {
      result = await this.reviewsService.findByReviewee(query.revieweeId, query.page, query.limit);
    } else if (query.reviewerId) {
      result = await this.reviewsService.findByReviewer(query.reviewerId, query.page, query.limit);
    } else {
      // Default to user's reviews (both as reviewer and reviewee)
      const reviewsAsReviewer = await this.reviewsService.findByReviewer(userId, query.page, query.limit);
      const reviewsAsReviewee = await this.reviewsService.findByReviewee(userId, query.page, query.limit);

      result = {
        reviews: [...reviewsAsReviewer.reviews, ...reviewsAsReviewee.reviews],
        total: reviewsAsReviewer.total + reviewsAsReviewee.total,
      };
    }

    const pages = Math.ceil(result.total / (query.limit || 10));

    return {
      success: true,
      data: {
        reviews: result.reviews,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 10,
          total: result.total,
          pages,
        },
      },
    };
  }

  @Get('stats/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get review statistics for a user' })
  @ApiParam({ name: 'userId', description: 'User ID to get statistics for' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review statistics retrieved successfully',
    type: ReviewStatsResponseDto,
  })
  async getReviewStats(@Param('userId') userId: string): Promise<ReviewStatsResponseDto> {
    const stats = await this.reviewsService.getReviewStats(userId);
    return {
      success: true,
      data: {
        revieweeId: userId,
        totalReviews: stats.totalReviews,
        averageRating: stats.averageRating,
        ratingDistribution: stats.ratingDistribution as { 1: number; 2: number; 3: number; 4: number; 5: number; },
      },
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a review (admin only)' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  async deleteReview(
    @Param('id') reviewId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.reviewsService.deleteReview(reviewId, userId);
    return {
      success: true,
      message: 'Review deleted successfully',
    };
  }
}
