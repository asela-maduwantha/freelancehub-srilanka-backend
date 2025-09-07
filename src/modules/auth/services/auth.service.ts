import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../../../schemas/user.schema';
import { Otp, OtpDocument } from '../../../schemas/otp.schema';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../../common/services/email.service';
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
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { email, password, role, firstName, lastName } = registerDto;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = this.generateOtp();
    const otpExpiry = new Date(
      Date.now() +
        (this.configService.get<number>('app.otpExpiry') || 600) * 1000,
    );

    // Create user with combined name
    const fullName = `${firstName} ${lastName}`;
    const user = new this.userModel({
      name: fullName,
      email,
      password: hashedPassword,
      role,
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

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email first');
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
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
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
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
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

  async logout(): Promise<{ message: string }> {
    // For JWT, logout is typically handled on the client side
    // by removing the token from storage. Server-side logout
    // would require token blacklisting which is not implemented here.
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

    // Generate reset token
    const resetToken = this.generateResetToken();
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

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateResetToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
}
