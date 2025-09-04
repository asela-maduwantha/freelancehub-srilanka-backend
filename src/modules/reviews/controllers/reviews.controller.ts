import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
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
import { ReviewsService } from '../services/reviews.service';
import { CreateReviewDto } from '../dto/create-review.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../../common/interfaces/pagination.interface';

interface ReviewQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  rating?: string;
  type?: 'received' | 'given';
}

@ApiTags('reviews')
@ApiBearerAuth('JWT-auth')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new review' })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        rating: { type: 'number', minimum: 1, maximum: 5 },
        comment: { type: 'string' },
        reviewerId: { type: 'string' },
        revieweeId: { type: 'string' },
        contractId: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Review already exists for this contract',
  })
  async createReview(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.createReview(req.user.userId, createReviewDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get reviews for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID to get reviews for' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Limit number of results',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: 'number',
    description: 'Offset for pagination',
  })
  @ApiQuery({
    name: 'rating',
    required: false,
    type: 'number',
    description: 'Filter by rating (1-5)',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          rating: { type: 'number' },
          comment: { type: 'string' },
          reviewer: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
          },
          contract: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          helpfulCount: { type: 'number' },
        },
      },
    },
  })
  async getReviewsForUser(
    @Param('userId') userId: string,
    @Query() query: ReviewQuery,
  ) {
    return this.reviewsService.getReviewsForUser(userId, query);
  }

  @Get('user/:userId/stats')
  @ApiOperation({ summary: 'Get review statistics for a user' })
  @ApiParam({ name: 'userId', description: 'User ID to get statistics for' })
  @ApiResponse({
    status: 200,
    description: 'Review statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        averageRating: { type: 'number', description: 'Average rating (1-5)' },
        totalReviews: {
          type: 'number',
          description: 'Total number of reviews',
        },
        ratingDistribution: {
          type: 'object',
          properties: {
            1: { type: 'number' },
            2: { type: 'number' },
            3: { type: 'number' },
            4: { type: 'number' },
            5: { type: 'number' },
          },
        },
        recentReviews: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              rating: { type: 'number' },
              comment: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  async getUserReviewStats(@Param('userId') userId: string) {
    return this.reviewsService.getUserReviewStats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get review by ID' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: 200,
    description: 'Review retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        rating: { type: 'number' },
        comment: { type: 'string' },
        response: { type: 'string' },
        reviewer: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
        reviewee: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
        contract: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        helpfulCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async getReviewById(@Param('id') reviewId: string) {
    return this.reviewsService.getReviewById(reviewId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: 200,
    description: 'Review updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Review updated successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not the reviewer' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async updateReview(
    @Request() req,
    @Param('id') reviewId: string,
    @Body() updateData: Partial<CreateReviewDto>,
  ) {
    return this.reviewsService.updateReview(
      reviewId,
      req.user.userId,
      updateData,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: 200,
    description: 'Review deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Review deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not the reviewer' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async deleteReview(@Request() req, @Param('id') reviewId: string) {
    await this.reviewsService.deleteReview(reviewId, req.user.userId);
    return 'Review deleted successfully';
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Respond to review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        response: { type: 'string', description: 'Response to the review' },
      },
      required: ['response'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Response added successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Response added successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not the reviewee' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async respondToReview(
    @Request() req,
    @Param('id') reviewId: string,
    @Body('response') response: string,
  ) {
    return this.reviewsService.respondToReview(
      reviewId,
      req.user.userId,
      response,
    );
  }

  @Post(':id/helpful')
  @ApiOperation({ summary: 'Mark review as helpful' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: 200,
    description: 'Review marked as helpful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Review marked as helpful' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Review not found' })
  @ApiResponse({ status: 409, description: 'Already marked as helpful' })
  async markReviewHelpful(@Request() req, @Param('id') reviewId: string) {
    await this.reviewsService.markReviewHelpful(reviewId, req.user.userId);
    return 'Review marked as helpful';
  }
}
