import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, Contract, User } from '../../database/schemas';
import { CreateReviewDto, RespondReviewDto } from './dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<Review>,
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private notificationsService: NotificationsService,
  ) {}

  async create(createReviewDto: CreateReviewDto, reviewerId: string): Promise<Review> {
    // Validate contract exists and user is part of it
    const contract = await this.contractModel.findById(createReviewDto.contractId);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Check if user is authorized to review (must be client or freelancer in the contract)
    if (contract.clientId.toString() !== reviewerId && contract.freelancerId.toString() !== reviewerId) {
      throw new ForbiddenException('You are not authorized to review this contract');
    }

    // Determine who is being reviewed
    const revieweeId = createReviewDto.revieweeId;
    if (revieweeId !== contract.clientId.toString() && revieweeId !== contract.freelancerId.toString()) {
      throw new BadRequestException('Reviewee must be part of the contract');
    }

    // Prevent self-review
    if (reviewerId === revieweeId) {
      throw new BadRequestException('You cannot review yourself');
    }

    // Check if contract is completed (only completed contracts can be reviewed)
    if (contract.status !== 'completed') {
      throw new BadRequestException('Can only review completed contracts');
    }

    // Check if review already exists for this contract and reviewer
    const existingReview = await this.reviewModel.findOne({
      contractId: createReviewDto.contractId,
      reviewerId: reviewerId,
      deletedAt: null,
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this contract');
    }

    const review = new this.reviewModel({
      ...createReviewDto,
      contractId: new Types.ObjectId(createReviewDto.contractId),
      reviewerId: new Types.ObjectId(reviewerId),
      revieweeId: new Types.ObjectId(revieweeId),
      isPublic: createReviewDto.isPublic ?? true,
    });

    const savedReview = await review.save();

    // Send notification to the reviewee
    try {
      await this.notificationsService.notifyReviewReceived(
        (savedReview._id as Types.ObjectId).toString(),
        savedReview.rating,
        revieweeId
      );
    } catch (notificationError) {
      console.error('Failed to send review received notification:', notificationError);
      // Don't fail review creation if notification fails
    }

    // Clear cache
    await this.invalidateReviewCache(revieweeId);

    return savedReview.toJSON();
  }

  async respondToReview(reviewId: string, respondDto: RespondReviewDto, userId: string): Promise<Review> {
    const review = await this.reviewModel.findOne({ _id: reviewId, deletedAt: null });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Only the reviewee can respond to their review
    if (review.revieweeId.toString() !== userId) {
      throw new ForbiddenException('Only the reviewee can respond to this review');
    }

    // Check if already responded
    if (review.response) {
      throw new BadRequestException('Review has already been responded to');
    }

    review.response = respondDto.response;
    review.respondedAt = new Date();
    await review.save();

    // Clear cache
    await this.invalidateReviewCache(review.revieweeId.toString());

    return review.toJSON();
  }

  async findById(id: string): Promise<Review> {
    const cacheKey = `review:${id}`;

    const cachedReview = await this.cacheManager.get<Review>(cacheKey);
    if (cachedReview) {
      return cachedReview;
    }

    const review = await this.reviewModel
      .findOne({ _id: id, deletedAt: null })
      .populate('contractId', 'title')
      .populate('reviewerId', 'profile.firstName profile.lastName profile.avatar')
      .populate('revieweeId', 'profile.firstName profile.lastName profile.avatar')
      .exec();

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.cacheManager.set(cacheKey, review, 300000); // Cache for 5 minutes
    return review.toJSON();
  }

  async findByReviewee(revieweeId: string, page: number = 1, limit: number = 10): Promise<{ reviews: Review[]; total: number }> {
    const cacheKey = `reviews:reviewee:${revieweeId}:page:${page}:limit:${limit}`;

    const cachedResult = await this.cacheManager.get<{ reviews: Review[]; total: number }>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({ revieweeId, isPublic: true, deletedAt: null })
        .populate('contractId', 'title')
        .populate('reviewerId', 'profile.firstName profile.lastName profile.avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments({ revieweeId, isPublic: true, deletedAt: null }),
    ]);

    const result = { reviews: reviews.map(r => r.toJSON()), total };
    await this.cacheManager.set(cacheKey, result, 300000); // Cache for 5 minutes

    return result;
  }

  async findByReviewer(reviewerId: string, page: number = 1, limit: number = 10): Promise<{ reviews: Review[]; total: number }> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({ reviewerId, deletedAt: null })
        .populate('contractId', 'title')
        .populate('revieweeId', 'profile.firstName profile.lastName profile.avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments({ reviewerId, deletedAt: null }),
    ]);

    return { reviews: reviews.map(r => r.toJSON()), total };
  }

  async getReviewStats(revieweeId: string): Promise<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
  }> {
    const cacheKey = `review_stats:${revieweeId}`;

    const cachedStats = await this.cacheManager.get<{
      totalReviews: number;
      averageRating: number;
      ratingDistribution: { [key: number]: number };
    }>(cacheKey);

    if (cachedStats) {
      return cachedStats;
    }

    const reviews = await this.reviewModel.find({
      revieweeId,
      isPublic: true,
      deletedAt: null,
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1;
    });

    const stats = { totalReviews, averageRating, ratingDistribution };
    await this.cacheManager.set(cacheKey, stats, 300000); // Cache for 5 minutes

    return stats;
  }

  async deleteReview(id: string, userId: string): Promise<void> {
    const review = await this.reviewModel.findOne({ _id: id, deletedAt: null });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Only the reviewer can delete their review
    if (review.reviewerId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    review.deletedAt = new Date();
    await review.save();

    // Clear cache
    await this.invalidateReviewCache(review.revieweeId.toString());
  }

  private async invalidateReviewCache(revieweeId: string): Promise<void> {
    try {
      // Clear review stats cache
      await this.cacheManager.del(`review_stats:${revieweeId}`);
      
      // Clear review list caches for this reviewee (first few pages)
      for (let page = 1; page <= 5; page++) {
        for (const limit of [10, 20, 50]) {
          await this.cacheManager.del(`reviews:reviewee:${revieweeId}:page:${page}:limit:${limit}`);
        }
      }
    } catch (error) {
      console.error(`Failed to invalidate review cache for reviewee ${revieweeId}:`, error);
      // Don't throw - cache invalidation failures shouldn't break the operation
    }
  }
}