import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserDocument, MAX_LOGIN_ATTEMPTS } from '../../../schemas/user.schema';
import { Otp, OtpDocument } from '../../../schemas/otp.schema';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../../common/services/email.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { createUserResponse } from '../../../common/interfaces/user-response.interface';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import {
  UnauthorizedException,
  BadRequestException,
} from '../../../common/exceptions';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { email, password, role, firstName, lastName } = registerDto;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12); // Increased salt rounds
    const otpCode = this.generateSecureOtp();
    const otpExpiry = new Date(
      Date.now() +
        (this.configService.get<number>('app.otpExpiry') || 600) * 1000,
    );

    // Create user with new structure
    const user = new this.userModel({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: Array.isArray(role) ? role : [role], // Ensure role is an array
    });

    await user.save();

    // Create OTP record
    const otp = new this.otpModel({
      email,
      otp: otpCode,
      otpType: 'email_verification',
      expiresAt: otpExpiry,
    });

    await otp.save();

    // Send OTP email
    await this.emailService.sendOtpEmail(email, otpCode);

    return {
      message:
        'Registration successful. Please verify your email with the OTP sent.',
    };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ access_token: string; refresh_token: string; user: any }> {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.isLocked) {
      throw new UnauthorizedException(
        'Account is temporarily locked due to too many failed login attempts. Please try again later.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Increment login attempts
      user.loginAttempts += 1;
      user.lastFailedLogin = new Date();
      
      await user.save();

      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        throw new UnauthorizedException(
          'Account locked due to too many failed login attempts. Please try again in 2 hours.',
        );
      }

      throw new UnauthorizedException(
        `Invalid credentials. ${MAX_LOGIN_ATTEMPTS - user.loginAttempts} attempts remaining.`,
      );
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
    }

    const payload = { email: user.email, sub: user._id, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('app.refreshTokenExpiresIn'),
    });

    user.lastLoginAt = new Date();
    await user.save();

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: createUserResponse(user),
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{
    message: string;
    access_token: string;
    refresh_token: string;
    user: any;
  }> {
    const { email, otp } = verifyOtpDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Find the OTP record
    const otpRecord = await this.otpModel.findOne({
      email,
      otp,
      otpType: 'email_verification',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Mark user as verified and update login time
    user.emailVerified = true;
    user.lastLoginAt = new Date();
    
    // Reset any failed login attempts on successful verification
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    
    await user.save();

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    const payload = { email: user.email, sub: user._id, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('app.refreshTokenExpiresIn'),
    });

    return {
      message: 'Email verified successfully',
      access_token: accessToken,
      refresh_token: refreshToken,
      user: createUserResponse(user),
    };
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userModel.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException();
      }

      const newPayload = {
        email: user.email,
        sub: user._id,
        role: user.role,
      };
      const accessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get<string>('app.refreshTokenExpiresIn'),
      });

      return { access_token: accessToken, refresh_token: newRefreshToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(token: string, userId: string): Promise<{ message: string }> {
    // Add token to blacklist
    await this.tokenBlacklistService.blacklistToken(token, userId, 'logout');
    
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        message: 'If the email exists, a password reset link has been sent',
      };
    }

    // Generate secure reset token
    const resetToken = this.generateSecureResetToken();
    const resetTokenExpiry = new Date(
      Date.now() + 30 * 60 * 1000, // 30 minutes
    );

    // Create OTP record for password reset
    const otp = new this.otpModel({
      email,
      otp: resetToken,
      otpType: 'password_reset',
      expiresAt: resetTokenExpiry,
    });

    await otp.save();

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(email, resetToken);

    return { message: 'Password reset email sent successfully' };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // Find the OTP record
    const otpRecord = await this.otpModel.findOne({
      otp: token,
      otpType: 'password_reset',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Find the user
    const user = await this.userModel.findOne({ email: otpRecord.email });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    return { message: 'Password reset successfully' };
  }

  /**
   * Generate secure alphanumeric OTP (8 characters)
   */
  private generateSecureOtp(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(crypto.randomInt(0, chars.length));
    }
    return result;
  }

  /**
   * Generate secure reset token (64 characters hex)
   */
  private generateSecureResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Legacy method for compatibility - now uses secure generation
   * @deprecated Use generateSecureOtp() instead
   */
  private generateOtp(): string {
    return this.generateSecureOtp();
  }

  /**
   * Legacy method for compatibility - now uses secure generation
   * @deprecated Use generateSecureResetToken() instead
   */
  private generateResetToken(): string {
    return this.generateSecureResetToken();
  }
}
