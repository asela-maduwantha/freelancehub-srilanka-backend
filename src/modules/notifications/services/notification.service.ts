import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { Notification, NotificationDocument } from '../../../schemas/notification.schema';
import { User, UserDocument } from '../../../schemas/user.schema';
import { EmailService } from '../../../common/services/email.service';
import { CreateNotificationDto, NotificationResponseDto } from '../dto/notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private firebaseApp: admin.app.App;

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const serviceAccount = {
        type: 'service_account',
        project_id: this.configService.get<string>('FIREBASE_PROJECT_ID'),
        private_key_id: this.configService.get<string>('FIREBASE_PRIVATE_KEY_ID'),
        private_key: this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
        client_email: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
        client_id: this.configService.get<string>('FIREBASE_CLIENT_ID'),
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: this.configService.get<string>('FIREBASE_CLIENT_X509_CERT_URL'),
      };

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as any),
        projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
      });

      this.logger.log('Firebase initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase:', error);
    }
  }

  /**
   * Create and send a notification
   */
  async createNotification(createDto: CreateNotificationDto): Promise<NotificationDocument> {
    const notification = new this.notificationModel({
      userId: new Types.ObjectId(createDto.userId),
      type: createDto.type,
      title: createDto.title,
      content: createDto.content,
      relatedEntity: createDto.relatedEntity ? {
        entityType: createDto.relatedEntity.entityType,
        entityId: new Types.ObjectId(createDto.relatedEntity.entityId),
      } : undefined,
      priority: createDto.priority || 'medium',
    });

    const savedNotification = await notification.save();

    // Send push notification
    await this.sendPushNotification(savedNotification);

    // Send email notification if enabled
    await this.sendEmailNotification(savedNotification);

    return savedNotification;
  }

  /**
   * Send push notification via Firebase
   */
  private async sendPushNotification(notification: NotificationDocument): Promise<void> {
    try {
      if (!this.firebaseApp) {
        this.logger.warn('Firebase not initialized, skipping push notification');
        return;
      }

      // Get user's FCM token (you'll need to store this in user profile)
      const fcmToken = await this.getUserFCMToken(notification.userId.toString());

      if (!fcmToken) {
        this.logger.debug(`No FCM token found for user ${notification.userId}`);
        return;
      }

      const message = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.content,
        },
        data: {
          type: notification.type,
          notificationId: (notification._id as any).toString(),
          relatedEntity: notification.relatedEntity ? JSON.stringify(notification.relatedEntity) : '',
        },
        android: {
          priority: this.getAndroidPriority(notification.priority) as any,
          notification: {
            channelId: this.getNotificationChannel(notification.type),
            priority: this.getAndroidPriority(notification.priority) as any,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.content,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.firebaseApp.messaging().send(message);
      this.logger.debug(`Push notification sent: ${response}`);
    } catch (error) {
      this.logger.error('Failed to send push notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: NotificationDocument): Promise<void> {
    try {
      // Get user's email and notification preferences
      const user = await this.getUserWithPreferences(notification.userId.toString());

      if (!user || !user.emailNotifications) {
        return;
      }

      // Check specific notification type preference
      const typePreference = this.getTypePreference(notification.type, user);
      if (!typePreference) {
        return;
      }

      const emailContent = this.generateEmailContent(notification);
      const subject = this.generateEmailSubject(notification);

      await this.emailService.sendNotificationEmail(user.email, subject, emailContent);
    } catch (error) {
      this.logger.error('Failed to send email notification:', error);
    }
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    isRead?: boolean,
  ): Promise<{ notifications: NotificationResponseDto[]; total: number; unreadCount: number }> {
    const query: any = { userId: new Types.ObjectId(userId) };

    if (isRead !== undefined) {
      query.isRead = isRead;
    }

    const total = await this.notificationModel.countDocuments(query);
    const unreadCount = await this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    });

    const notifications = await this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const notificationDtos: NotificationResponseDto[] = notifications.map(notification => ({
      id: notification._id.toString(),
      userId: notification.userId.toString(),
      type: notification.type,
      title: notification.title,
      content: notification.content,
      relatedEntity: notification.relatedEntity ? {
        entityType: notification.relatedEntity.entityType,
        entityId: notification.relatedEntity.entityId.toString(),
      } : undefined,
      priority: notification.priority,
      isRead: notification.isRead,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    }));

    return { notifications: notificationDtos, total, unreadCount };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationModel.updateOne(
      {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await this.notificationModel.deleteOne({
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId),
    });
  }

  /**
   * Get user's FCM token
   */
  private async getUserFCMToken(userId: string): Promise<string | null> {
    try {
      const user = await this.userModel.findById(userId).select('fcmToken').lean();
      return user?.fcmToken || null;
    } catch (error) {
      this.logger.error(`Failed to get FCM token for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get user with notification preferences
   */
  private async getUserWithPreferences(userId: string): Promise<any> {
    try {
      const user = await this.userModel
        .findById(userId)
        .select('email notificationPreferences')
        .lean();

      if (!user) return null;

      return {
        email: user.email,
        emailNotifications: user.notificationPreferences?.emailNotifications ?? true,
        pushNotifications: user.notificationPreferences?.pushNotifications ?? true,
        messageNotifications: user.notificationPreferences?.messageNotifications ?? true,
        proposalNotifications: user.notificationPreferences?.proposalNotifications ?? true,
        paymentNotifications: user.notificationPreferences?.paymentNotifications ?? true,
      };
    } catch (error) {
      this.logger.error(`Failed to get user preferences for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get Android priority based on notification priority
   */
  private getAndroidPriority(priority: string): 'normal' | 'high' {
    return priority === 'urgent' || priority === 'high' ? 'high' : 'normal';
  }

  /**
   * Get notification channel based on type
   */
  private getNotificationChannel(type: string): string {
    const channels = {
      message: 'messages',
      proposal: 'proposals',
      payment: 'payments',
      milestone: 'milestones',
      review: 'reviews',
    };
    return channels[type] || 'general';
  }

  /**
   * Generate email content for notification
   */
  private generateEmailContent(notification: NotificationDocument): string {
    const content = `
      <div class="highlight-box">
        <h2 style="margin: 0 0 15px 0; color: #16a34a;">${notification.title}</h2>
        <p style="margin: 0; line-height: 1.6;">${notification.content}</p>
        ${notification.relatedEntity ? `
          <p style="margin: 15px 0 0 0; font-size: 14px; color: #6b7280;">
            Related: ${notification.relatedEntity.entityType}
          </p>
        ` : ''}
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="#" class="cta-button">View Details</a>
      </div>
    `;

    return content;
  }

  /**
   * Get type-specific notification preference
   */
  private getTypePreference(type: string, user: any): boolean {
    switch (type) {
      case 'message':
        return user.messageNotifications;
      case 'proposal':
        return user.proposalNotifications;
      case 'payment':
      case 'milestone':
        return user.paymentNotifications;
      default:
        return true; // Default to true for other types
    }
  }

  /**
   * Generate email subject for notification
   */
  private generateEmailSubject(notification: NotificationDocument): string {
    return `${notification.title} - FreelanceHub`;
  }
}
