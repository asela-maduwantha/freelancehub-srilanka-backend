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
    this.logger.debug(`📋 Fetching notifications for user: ${userId}, filters: ${JSON.stringify(filters)}`);
    
    const query: any = { userId, deletedAt: null };
    if (filters.type) query.type = filters.type;
    if (filters.isRead !== undefined) query.isRead = filters.isRead;
    if (filters.relatedType) query.relatedType = filters.relatedType;

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    this.logger.debug(`🔍 Executing notification query: ${JSON.stringify(query)}, page: ${page}, limit: ${limit}`);

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "profile.firstName profile.lastName email")
        .exec(),
      this.notificationModel.countDocuments(query).exec(),
    ]);
    
    this.logger.debug(`📊 Retrieved ${notifications.length} notifications out of ${total} total for user: ${userId}`);

    // Convert to plain objects with proper serialization
    const serializedNotifications = notifications.map(notification => {
      const plainObj: any = notification.toObject();
      return {
        ...plainObj,
        _id: plainObj._id?.toString() || plainObj._id,
        userId: plainObj.userId && typeof plainObj.userId === 'object' && '_id' in plainObj.userId ? {
          _id: plainObj.userId._id?.toString() || plainObj.userId._id,
          email: plainObj.userId.email,
          profile: plainObj.userId.profile
        } : plainObj.userId,
        relatedId: plainObj.relatedId?.toString() || plainObj.relatedId
      };
    });

    return {
      notifications: serializedNotifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string): Promise<Notification> {
    this.logger.debug(`🔍 Finding notification: ${id} for user: ${userId}`);
    
    const notification = await this.notificationModel
      .findOne({ _id: id, userId, deletedAt: null })
      .populate("userId", "profile.firstName profile.lastName email")
      .exec();
      
    if (!notification) {
      this.logger.warn(`❌ Notification not found: ${id} for user: ${userId}`);
      throw new NotFoundException("Notification not found");
    }
    
    this.logger.debug(`✅ Found notification: ${id} for user: ${userId}, type: ${notification.type}`);
    
    // Convert to plain object with proper serialization
    const plainObj: any = notification.toObject();
    return {
      ...plainObj,
      _id: plainObj._id?.toString() || plainObj._id,
      userId: plainObj.userId && typeof plainObj.userId === 'object' && '_id' in plainObj.userId ? {
        _id: plainObj.userId._id?.toString() || plainObj.userId._id,
        email: plainObj.userId.email,
        profile: plainObj.userId.profile
      } : plainObj.userId,
      relatedId: plainObj.relatedId?.toString() || plainObj.relatedId
    } as any;
  }

  async getUnreadCount(userId: string): Promise<number> {
    this.logger.debug(`📊 Counting unread notifications for user: ${userId}`);
    
    const count = await this.notificationModel.countDocuments({
      userId,
      isRead: false,
      deletedAt: null,
    }).exec();
    
    this.logger.debug(`📊 User ${userId} has ${count} unread notifications`);
    return count;
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    this.logger.debug(`✓ Marking notification as read: ${id} for user: ${userId}`);
    
    const notification = await this.notificationModel
      .findOneAndUpdate(
        { _id: id, userId, deletedAt: null },
        { isRead: true, readAt: new Date() },
        { new: true },
      )
      .exec();
      
    if (notification) {
      this.logger.log(`✅ Notification marked as read: ${id} for user: ${userId}, type: ${notification.type}`);
    } else {
      this.logger.warn(`❌ Failed to mark notification as read - not found: ${id} for user: ${userId}`);
    }
    return notification;
  }

  async markAllAsRead(userId: string): Promise<any> {
    this.logger.debug(`✓ Marking all notifications as read for user: ${userId}`);
    
    // First get the count of unread notifications
    const unreadCount = await this.notificationModel.countDocuments({
      userId, 
      isRead: false, 
      deletedAt: null
    }).exec();
    
    this.logger.debug(`📊 Found ${unreadCount} unread notifications to mark as read for user: ${userId}`);
    
    const result = await this.notificationModel
      .updateMany(
        { userId, isRead: false, deletedAt: null },
        { isRead: true, readAt: new Date() },
      )
      .exec();
      
    this.logger.log(`✅ Marked ${result.modifiedCount} notifications as read for user: ${userId}`);
    return result;
  }

  async remove(id: string, userId: string): Promise<Notification> {
    this.logger.debug(`🗑️ Attempting to delete notification: ${id} for user: ${userId}`);
    
    const notification = await this.notificationModel
      .findOneAndDelete({ _id: id, userId })
      .exec();
      
    if (!notification) {
      this.logger.warn(`❌ Notification not found for deletion: ${id} for user: ${userId}`);
      throw new NotFoundException("Notification not found");
    }
    
    this.logger.log(`✅ Notification deleted: ${id} for user: ${userId}, type: ${notification.type}`);
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

  async notifyWithdrawalRequested(withdrawalId: string, amount: number, userId: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.WITHDRAWAL_REQUESTED,
      title: "Withdrawal Requested",
      message: `Your withdrawal request for $${amount.toFixed(2)} has been submitted and is being processed.`,
      relatedId: withdrawalId,
      relatedType: "withdrawal",
    });
  }

  async notifyWithdrawalCompleted(withdrawalId: string, amount: number, userId: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.WITHDRAWAL_COMPLETED,
      title: "Withdrawal Completed",
      message: `Your withdrawal of $${amount.toFixed(2)} has been successfully processed.`,
      relatedId: withdrawalId,
      relatedType: "withdrawal",
    });
  }

  async notifyUserLogin(userId: string, userEmail: string): Promise<Notification> {
    const now = new Date();
    const timeString = now.toLocaleString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return this.create({
      userId,
      type: NotificationType.LOGIN,
      title: "Welcome Back!",
      message: `You logged in successfully on ${timeString}.`,
      relatedId: userId,
      relatedType: "user",
    });
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    this.logger.debug(`📋 Fetching unread notifications for user: ${userId}`);
    
    const notifications = await this.notificationModel
      .find({
        userId,
        isRead: false,
        deletedAt: null,
      })
      .sort({ createdAt: -1 })
      .populate("userId", "profile.firstName profile.lastName email")
      .exec();
    
    this.logger.debug(`📋 Found ${notifications.length} unread notifications for user: ${userId}`);
    return notifications.map(this.transformNotification);
  }

  private transformNotification(notification: Notification) {
    const plainObj: any = notification.toObject();
    return {
      ...plainObj,
      _id: plainObj._id?.toString() || plainObj._id,
      userId: plainObj.userId && typeof plainObj.userId === 'object' && '_id' in plainObj.userId ? {
        _id: plainObj.userId._id?.toString() || plainObj.userId._id,
        email: plainObj.userId.email,
        profile: plainObj.userId.profile
      } : plainObj.userId,
      relatedId: plainObj.relatedId?.toString() || plainObj.relatedId
    };
  }
}
