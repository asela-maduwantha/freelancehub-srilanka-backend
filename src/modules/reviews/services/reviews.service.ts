import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review, ReviewDocument } from '../../../schemas/review.schema';
import { CreateReviewDto } from '../dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
  ) {}

  async createReview(reviewerId: string, createReviewDto: CreateReviewDto): Promise<Review> {
    const { revieweeId, projectId, rating, review, reviewType } = createReviewDto;

    // Check if reviewer has already reviewed this project
    const existingReview = await this.reviewModel.findOne({
      reviewerId,
      projectId,
      reviewType,
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this project');
    }

    const newReview = new this.reviewModel({
      ...createReviewDto,
      reviewerId,
      status: 'published', // Auto-publish for now
    });

    return newReview.save();
  }

  async getReviewsForUser(userId: string, query: any) {
    const { page = 1, limit = 10, reviewType } = query;

    const filter: any = { revieweeId: userId };

    if (reviewType) {
      filter.reviewType = reviewType;
    }

    const reviews = await this.reviewModel
      .find(filter)
      .populate('reviewerId', 'firstName lastName profilePicture')
      .populate('projectId', 'title')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await this.reviewModel.countDocuments(filter);

    // Calculate average rating
    const avgRating = await this.reviewModel.aggregate([
      { $match: filter },
      { $group: { _id: null, average: { $avg: '$rating' } } }
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      averageRating: avgRating[0]?.average || 0,
    };
  }

  async getReviewById(reviewId: string): Promise<Review> {
    const review = await this.reviewModel
      .findById(reviewId)
      .populate('reviewerId', 'firstName lastName profilePicture')
      .populate('revieweeId', 'firstName lastName profilePicture')
      .populate('projectId', 'title');

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async updateReview(reviewId: string, reviewerId: string, updateData: Partial<CreateReviewDto>): Promise<Review> {
    const review = await this.reviewModel.findOne({ _id: reviewId, reviewerId });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const updatedReview = await this.reviewModel.findByIdAndUpdate(reviewId, updateData, { new: true });

    if (!updatedReview) {
      throw new NotFoundException('Review not found');
    }

    return updatedReview;
  }

  async deleteReview(reviewId: string, reviewerId: string): Promise<void> {
    const review = await this.reviewModel.findOne({ _id: reviewId, reviewerId });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.reviewModel.findByIdAndDelete(reviewId);
  }

  async respondToReview(reviewId: string, revieweeId: string, response: string): Promise<Review> {
    const review = await this.reviewModel.findOne({ _id: reviewId, revieweeId });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const updatedReview = await this.reviewModel.findByIdAndUpdate(reviewId, {
      response,
      responseDate: new Date(),
    }, { new: true });

    if (!updatedReview) {
      throw new NotFoundException('Review not found');
    }

    return updatedReview;
  }

  async markReviewHelpful(reviewId: string, userId: string): Promise<void> {
    const review = await this.reviewModel.findById(reviewId);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Note: helpful property was removed from clean Review schema
    // This functionality would need to be reimplemented differently
    // or removed entirely in the clean architecture
    
    throw new BadRequestException('Review helpful functionality not available in clean schema');
  }

  async getUserReviewStats(userId: string) {
    const stats = await this.reviewModel.aggregate([
      { $match: { revieweeId: userId } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    stats[0].ratingDistribution.forEach((rating: number) => {
      distribution[rating as keyof typeof distribution]++;
    });

    return {
      totalReviews: stats[0].totalReviews,
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      ratingDistribution: distribution,
    };
  }
}
