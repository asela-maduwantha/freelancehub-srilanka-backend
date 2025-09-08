import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../schemas/user.schema';

@Injectable()
export class UserDataMigrationService {
  private readonly logger = new Logger(UserDataMigrationService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Migrate existing users from old schema to new schema
   * This should be run once after deploying the new schema
   */
  async migrateUsersToNewSchema(): Promise<{ migrated: number; errors: number }> {
    let migrated = 0;
    let errors = 0;

    try {
      // Find users with old schema (have 'name' field instead of firstName/lastName)
      const usersToMigrate = await this.userModel.find({
        $or: [
          { firstName: { $exists: false } },
          { lastName: { $exists: false } },
          { role: { $type: 'string' } }, // role should be array
        ],
      });

      this.logger.log(`Found ${usersToMigrate.length} users to migrate`);

      for (const user of usersToMigrate) {
        try {
          const updates: any = {};

          // Handle name to firstName/lastName conversion
          if ((user as any).name && (!user.firstName || !user.lastName)) {
            const nameParts = (user as any).name.split(' ');
            updates.firstName = nameParts[0] || 'Unknown';
            updates.lastName = nameParts.slice(1).join(' ') || 'User';
            
            // Remove old name field
            updates.$unset = { name: 1 };
          }

          // Handle role conversion from string to array
          if (typeof user.role === 'string') {
            updates.role = [user.role];
          }

          // Initialize new fields with defaults
          if (user.loginAttempts === undefined) {
            updates.loginAttempts = 0;
          }

          if (Object.keys(updates).length > 0) {
            await this.userModel.updateOne({ _id: user._id }, updates);
            migrated++;
            this.logger.debug(`Migrated user ${user.email}`);
          }
        } catch (error) {
          this.logger.error(`Failed to migrate user ${user.email}:`, error);
          errors++;
        }
      }

      this.logger.log(`Migration completed. Migrated: ${migrated}, Errors: ${errors}`);
      return { migrated, errors };
    } catch (error) {
      this.logger.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Validate that all users have the new schema format
   */
  async validateUserSchema(): Promise<{ valid: number; invalid: number }> {
    let valid = 0;
    let invalid = 0;

    const users = await this.userModel.find({});

    for (const user of users) {
      if (
        user.firstName &&
        user.lastName &&
        Array.isArray(user.role) &&
        user.loginAttempts !== undefined
      ) {
        valid++;
      } else {
        invalid++;
        this.logger.warn(`Invalid user schema: ${user.email}`);
      }
    }

    this.logger.log(`Schema validation completed. Valid: ${valid}, Invalid: ${invalid}`);
    return { valid, invalid };
  }
}
