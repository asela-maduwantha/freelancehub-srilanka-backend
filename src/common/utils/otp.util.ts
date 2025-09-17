import { AUTH_CONSTANTS } from '../constants/auth.constants';

export class OtpUtil {
  static generate(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  static createExpiryDate(): Date {
    return new Date(Date.now() + AUTH_CONSTANTS.OTP_EXPIRY_MINUTES * 60 * 1000);
  }

  static isValidFormat(otp: string): boolean {
    return /^\d{6}$/.test(otp);
  }

  static generateAlphanumeric(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static timeToExpiry(expiresAt: Date): number {
    return Math.max(0, expiresAt.getTime() - Date.now());
  }
}