import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Notification } from "../../database/schemas/notification.schema";
import { CreateNotificationDto, NotificationFilters } from "./dto";
import { NotificationType } from "../../common/enums/notification-type.enum";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    try {
      const notification = new this.notificationModel(createNotificationDto);
      const savedNotification = await notification.save();
      this.logger.log(`Notification created: ${savedNotification._id} for user: ${createNotificationDto.userId}`);
      return savedNotification;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`, error.stack);
      throw new BadRequestException("Failed to create notification");
    }
  }

  async findAll(userId: string, filters: NotificationFilters = {}) {
    const query: any = { userId, deletedAt: null };
    if (filters.type) query.type = filters.type;
    if (filters.isRead !== undefined) query.isRead = filters.isRead;
    if (filters.relatedType) query.relatedType = filters.relatedType;

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name email")
        .exec(),
      this.notificationModel.countDocuments(query).exec(),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationModel
      .findOne({ _id: id, userId, deletedAt: null })
      .populate("user", "name email")
      .exec();
    if (!notification) {
      throw new NotFoundException("Notification not found");
    }
    return notification;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId,
      isRead: false,
      deletedAt: null,
    }).exec();
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const notification = await this.notificationModel
      .findOneAndUpdate(
        { _id: id, userId, deletedAt: null },
        { isRead: true, readAt: new Date() },
        { new: true },
      )
      .exec();
    if (notification) {
      this.logger.log(`Notification marked as read: ${id} for user: ${userId}`);
    }
    return notification;
  }

  async markAllAsRead(userId: string): Promise<any> {
    const result = await this.notificationModel
      .updateMany(
        { userId, isRead: false, deletedAt: null },
        { isRead: true, readAt: new Date() },
      )
      .exec();
    this.logger.log(`Marked ${result.modifiedCount} notifications as read for user: ${userId}`);
    return result;
  }

  async remove(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationModel
      .findOneAndDelete({ _id: id, userId })
      .exec();
    if (!notification) {
      throw new NotFoundException("Notification not found");
    }
    this.logger.log(`Notification deleted: ${id} for user: ${userId}`);
    return notification;
  }

  // Helper methods for creating specific notification types
  async notifyJobPosted(jobId: string, jobTitle: string, userId: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.JOB_POSTED,
      title: "New Job Posted",
      message: `A new job "${jobTitle}" has been posted that matches your skills.`,
      relatedId: jobId,
      relatedType: "job",
    });
  }

  async notifyProposalReceived(proposalId: string, jobTitle: string, userId: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.PROPOSAL_RECEIVED,
      title: "New Proposal Received",
      message: `You received a new proposal for your job "${jobTitle}".`,
      relatedId: proposalId,
      relatedType: "proposal",
    });
  }

  async notifyProposalAccepted(proposalId: string, jobTitle: string, userId: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.PROPOSAL_ACCEPTED,
      title: "Proposal Accepted",
      message: `Your proposal for "${jobTitle}" has been accepted!`,
      relatedId: proposalId,
      relatedType: "proposal",
    });
  }

  async notifyContractCreated(contractId: string, jobTitle: string, userId: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.CONTRACT_CREATED,
      title: "Contract Created",
      message: `A contract has been created for "${jobTitle}".`,
      relatedId: contractId,
      relatedType: "contract",
    });
  }

  async notifyMilestoneCreated(milestoneId: string, milestoneTitle: string, userId: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.MILESTONE_CREATED,
      title: "Milestone Created",
      message: `A new milestone "${milestoneTitle}" has been created for your contract.`,
      relatedId: milestoneId,
      relatedType: "milestone",
    });
  }

  async notifyMilestoneSubmitted(milestoneId: string, milestoneTitle: string, userId: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.MILESTONE_SUBMITTED,
      title: "Milestone Submitted",
      message: `Milestone "${milestoneTitle}" has been submitted for review.`,
      relatedId: milestoneId,
      relatedType: "milestone",
    });
  }

  async notifyMilestoneCompleted(milestoneId: string, milestoneTitle: string, userId: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.MILESTONE_APPROVED,
      title: "Milestone Completed",
      message: `Milestone "${milestoneTitle}" has been completed.`,
      relatedId: milestoneId,
      relatedType: "milestone",
    });
  }

  async notifyPaymentReceived(paymentId: string, amount: number, userId: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.PAYMENT_RECEIVED,
      title: "Payment Received",
      message: `You have received a payment of $${amount}.`,
      relatedId: paymentId,
      relatedType: "payment",
    });
  }

  async notifyPaymentSent(paymentId: string, amount: number, userId: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.PAYMENT_SENT,
      title: "Payment Sent",
      message: `A payment of $${amount} has been sent to you.`,
      relatedId: paymentId,
      relatedType: "payment",
    });
  }

  async notifyPaymentRefunded(paymentId: string, amount: number, userId: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.PAYMENT_REFUNDED,
      title: "Payment Refunded",
      message: `A payment of $${amount} has been refunded.`,
      relatedId: paymentId,
      relatedType: "payment",
    });
  }

  async notifyDisputeCreated(disputeId: string, contractTitle: string, userId: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.DISPUTE_CREATED,
      title: "Dispute Created",
      message: `A dispute has been created for contract "${contractTitle}". Please review the details.`,
      relatedId: disputeId,
      relatedType: "dispute",
    });
  }

  async notifyContractCompleted(contractId: string, jobTitle: string, userId: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.CONTRACT_COMPLETED,
      title: "Contract Completed",
      message: `Contract for "${jobTitle}" has been completed successfully.`,
      relatedId: contractId,
      relatedType: "contract",
    });
  }

  async notifyContractCancelled(contractId: string, jobTitle: string, userId: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.CONTRACT_CANCELLED,
      title: "Contract Cancelled",
      message: `Contract for "${jobTitle}" has been cancelled.`,
      relatedId: contractId,
      relatedType: "contract",
    });
  }

  async notifyReviewReceived(reviewId: string, rating: number, userId: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.REVIEW_RECEIVED,
      title: "New Review Received",
      message: `You received a ${rating}-star review.`,
      relatedId: reviewId,
      relatedType: "review",
    });
  }
}
