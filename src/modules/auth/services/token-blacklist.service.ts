import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { TokenBlacklist, TokenBlacklistDocument } from '../../../schemas/token-blacklist.schema';

@Injectable()
export class TokenBlacklistService {
  constructor(
    @InjectModel(TokenBlacklist.name)
    private tokenBlacklistModel: Model<TokenBlacklistDocument>,
    private jwtService: JwtService,
  ) {}

  /**
   * Add token to blacklist
   */
  async blacklistToken(
    token: string,
    userId: string,
    reason: 'logout' | 'password_reset' | 'security' = 'logout',
  ): Promise<void> {
    try {
      // Decode token to get expiration time
      const decoded = this.jwtService.decode(token) as any;
      const expiresAt = new Date(decoded.exp * 1000);

      await this.tokenBlacklistModel.create({
        token,
        userId,
        reason,
        expiresAt,
      });
    } catch (error) {
      // If token is malformed, still blacklist it but with a default expiration
      await this.tokenBlacklistModel.create({
        token,
        userId,
        reason,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
      });
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistedToken = await this.tokenBlacklistModel.findOne({
      token,
      expiresAt: { $gt: new Date() },
    });

    return !!blacklistedToken;
  }

  /**
   * Blacklist all tokens for a user (useful for password reset, account suspension)
   */
  async blacklistAllUserTokens(
    userId: string,
    reason: 'password_reset' | 'security' = 'security',
  ): Promise<void> {
    // This is a placeholder - in a real implementation, you'd need to track active tokens
    // For now, we'll implement a user-based token invalidation approach
    await this.tokenBlacklistModel.create({
      token: `USER_INVALIDATION_${userId}_${Date.now()}`,
      userId,
      reason,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
  }

  /**
   * Clean up expired blacklisted tokens (called by cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.tokenBlacklistModel.deleteMany({
      expiresAt: { $lte: new Date() },
    });
    return result.deletedCount || 0;
  }
}
