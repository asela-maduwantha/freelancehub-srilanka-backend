import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { CacheTTL, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { User } from '../../database/schemas/user.schema';
import { OtpVerification } from '../../database/schemas/otp-verification.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CheckEmailDto } from './dto/check-email.dto';
import { SendVerificationDto } from './dto/send-verification.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import {
  AuthResponseDto,
  UserResponseDto,
  MessageResponseDto,
} from './dto/auth-response.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { OtpPurpose } from '../../common/enums/otp-purpose.enum';
import { RESPONSE_MESSAGES } from '../../common/constants/response-messages';
import { AUTH_CONSTANTS } from '../../common/constants/auth.constants';
import { HashUtil } from '../../common/utils/hash.util';
import { OtpUtil } from '../../common/utils/otp.util';
import { EmailService } from '../../services/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(OtpVerification.name)
    private readonly otpModel: Model<OtpVerification>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // Register new user
  async register(registerDto: RegisterDto): Promise<MessageResponseDto> {
    const { email, password, role, firstName, lastName, phone } = registerDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      throw new ConflictException(RESPONSE_MESSAGES.AUTH.EMAIL_ALREADY_EXISTS);
    }

    // Hash password
    const hashedPassword = await HashUtil.hash(password);

    // Create new user
    const newUser = new this.userModel({
      email,
      password: hashedPassword,
      role,
      profile: {
        firstName,
        lastName,
        phone,
      },
    });

    await newUser.save();

    // Send email verification OTP
    await this.sendOtp(email, OtpPurpose.EMAIL_VERIFICATION);

    return {
      message: RESPONSE_MESSAGES.AUTH.REGISTRATION_SUCCESS,
    };
  }

  // Login user
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password, rememberMe } = loginDto;

    // Validate user credentials
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException(
        RESPONSE_MESSAGES.AUTH.INVALID_CREDENTIALS,
      );
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      // Resend OTP for email verification
      await this.sendOtp(email, OtpPurpose.EMAIL_VERIFICATION);
      throw new UnauthorizedException(
        RESPONSE_MESSAGES.AUTH.EMAIL_NOT_VERIFIED,
      );
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException(
        RESPONSE_MESSAGES.AUTH.ACCOUNT_DEACTIVATED,
      );
    }

    // Update last login time
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens
    const tokens = await this.generateTokens(user, rememberMe);

    return {
      ...tokens,
      user: this.transformUserResponse(user),
      expiresIn: AUTH_CONSTANTS.JWT_EXPIRES_IN,
    };
  }

  // Validate user credentials
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userModel.findOne({ email }).exec();

    if (!user) {
      return null;
    }

    const isPasswordValid = await HashUtil.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  // Verify email with OTP
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<AuthResponseDto> {
    const { email, otp } = verifyEmailDto;

    // Find and validate OTP
    const otpRecord = await this.validateOtp(
      email,
      otp,
      OtpPurpose.EMAIL_VERIFICATION,
    );

    // Find user
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.AUTH.USER_NOT_FOUND);
    }

    // Mark email as verified
    user.isEmailVerified = true;
    await user.save();

    // Mark OTP as used
    otpRecord.isUsed = true;
    otpRecord.usedAt = new Date();
    await otpRecord.save();

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: this.transformUserResponse(user),
      expiresIn: AUTH_CONSTANTS.JWT_EXPIRES_IN,
    };
  }

  // Forgot password
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<MessageResponseDto> {
    const { email } = forgotPasswordDto;

    // Check if user exists
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        message: RESPONSE_MESSAGES.AUTH.PASSWORD_RESET_SENT,
      };
    }

    // Send password reset OTP
    await this.sendOtp(email, OtpPurpose.PASSWORD_RESET);

    return {
      message: RESPONSE_MESSAGES.AUTH.PASSWORD_RESET_SENT,
    };
  }

  // Reset password
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<MessageResponseDto> {
    const { email, otp, newPassword } = resetPasswordDto;

    // Find and validate OTP
    const otpRecord = await this.validateOtp(
      email,
      otp,
      OtpPurpose.PASSWORD_RESET,
    );

    // Find user
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.AUTH.USER_NOT_FOUND);
    }

    // Hash new password
    const hashedPassword = await HashUtil.hash(newPassword);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    // Mark OTP as used
    otpRecord.isUsed = true;
    otpRecord.usedAt = new Date();
    await otpRecord.save();

    return {
      message: RESPONSE_MESSAGES.AUTH.PASSWORD_RESET_SUCCESS,
    };
  }

  // Change password (for authenticated users)
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Find user
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.AUTH.USER_NOT_FOUND);
    }

    // Verify current password
    const isCurrentPasswordValid = await HashUtil.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException(RESPONSE_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // Hash new password
    const hashedPassword = await HashUtil.hash(newPassword);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    return {
      message: RESPONSE_MESSAGES.AUTH.PASSWORD_RESET_SUCCESS,
    };
  }

  // Resend OTP
  async resendOtp(resendOtpDto: ResendOtpDto): Promise<MessageResponseDto> {
    const { email, purpose } = resendOtpDto;

    // For email verification, check if user exists
    if (purpose === OtpPurpose.EMAIL_VERIFICATION) {
      const user = await this.userModel.findOne({ email }).exec();
      if (!user) {
        throw new NotFoundException(RESPONSE_MESSAGES.AUTH.USER_NOT_FOUND);
      }

      if (user.isEmailVerified) {
        throw new BadRequestException('Email is already verified');
      }
    }

    // Send OTP
    await this.sendOtp(email, purpose);

    return {
      message: RESPONSE_MESSAGES.AUTH.OTP_SENT,
    };
  }

  // Refresh token
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userModel.findById(payload.sub).exec();
      if (!user || !user.isActive) {
        throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH.UNAUTHORIZED);
      }

      const tokens = await this.generateTokens(user);

      return {
        ...tokens,
        user: this.transformUserResponse(user),
        expiresIn: AUTH_CONSTANTS.JWT_EXPIRES_IN,
      };
    } catch (error) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH.TOKEN_INVALID);
    }
  }

  @CacheTTL(180) // 3 minutes for user profiles
  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.AUTH.USER_NOT_FOUND);
    }

    return this.transformUserResponse(user);
  }

  // Logout (invalidate refresh token - would need Redis for token blacklisting)
  async logout(): Promise<MessageResponseDto> {
    // In a real implementation, you would blacklist the tokens using Redis
    // For now, we'll just return a success message
    return {
      message: RESPONSE_MESSAGES.AUTH.LOGOUT_SUCCESS,
    };
  }

  // Check if email already exists
  async checkEmail(checkEmailDto: CheckEmailDto): Promise<MessageResponseDto> {
    const { email } = checkEmailDto;

    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      throw new ConflictException(RESPONSE_MESSAGES.AUTH.EMAIL_ALREADY_EXISTS);
    }

    return {
      message: RESPONSE_MESSAGES.AUTH.EMAIL_AVAILABLE,
    };
  }

  // Send email verification OTP
  async sendVerification(
    sendVerificationDto: SendVerificationDto,
  ): Promise<MessageResponseDto> {
    const { email } = sendVerificationDto;

    // Check if user exists
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.AUTH.USER_NOT_FOUND);
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      throw new BadRequestException(
        RESPONSE_MESSAGES.AUTH.EMAIL_ALREADY_VERIFIED,
      );
    }

    // Send email verification OTP
    await this.sendOtp(email, OtpPurpose.EMAIL_VERIFICATION);

    return {
      message: RESPONSE_MESSAGES.AUTH.VERIFICATION_OTP_SENT,
    };
  }

  // Resend email verification OTP
  async resendVerification(
    resendVerificationDto: ResendVerificationDto,
  ): Promise<MessageResponseDto> {
    const { email } = resendVerificationDto;

    // Check if user exists
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.AUTH.USER_NOT_FOUND);
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      throw new BadRequestException(
        RESPONSE_MESSAGES.AUTH.EMAIL_ALREADY_VERIFIED,
      );
    }

    // Send email verification OTP
    await this.sendOtp(email, OtpPurpose.EMAIL_VERIFICATION);

    return {
      message: RESPONSE_MESSAGES.AUTH.VERIFICATION_OTP_RESENT,
    };
  }

  private async generateTokens(user: User, rememberMe = false) {
    const payload = {
      sub: (user as any)._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessTokenExpiry = rememberMe
      ? '30d'
      : AUTH_CONSTANTS.JWT_EXPIRES_IN;
    const refreshTokenExpiry = AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: accessTokenExpiry,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTokenExpiry,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async sendOtp(email: string, purpose: OtpPurpose): Promise<void> {
    // Delete any existing OTPs for this email and purpose
    await this.otpModel.deleteMany({ email, purpose }).exec();

    // Generate new OTP
    const otp = OtpUtil.generate();
    const expiresAt = OtpUtil.createExpiryDate();

    // Save OTP to database
    const otpRecord = new this.otpModel({
      email,
      otp,
      purpose,
      expiresAt,
    });

    await otpRecord.save();

    // Send email based on purpose
    switch (purpose) {
      case OtpPurpose.EMAIL_VERIFICATION:
        await this.emailService.sendEmailVerificationOtp(email, otp);
        break;
      case OtpPurpose.PASSWORD_RESET:
        await this.emailService.sendPasswordResetOtp(email, otp);
        break;
      case OtpPurpose.LOGIN:
        await this.emailService.sendLoginOtp(email, otp);
        break;
    }
  }

  private async validateOtp(
    email: string,
    otp: string,
    purpose: OtpPurpose,
  ): Promise<OtpVerification> {
    const otpRecord = await this.otpModel.findOne({ email, purpose }).exec();

    if (!otpRecord) {
      throw new BadRequestException(RESPONSE_MESSAGES.AUTH.INVALID_OTP);
    }

    // Check if OTP attempts are exhausted
    if (otpRecord.isAttemptsExhausted) {
      throw new BadRequestException(
        RESPONSE_MESSAGES.AUTH.MAX_OTP_ATTEMPTS_REACHED,
      );
    }

    // Increment attempts
    otpRecord.attempts += 1;
    await otpRecord.save();

    // Check if OTP is expired
    if (otpRecord.isExpired) {
      throw new BadRequestException(RESPONSE_MESSAGES.AUTH.OTP_EXPIRED);
    }

    // Check if OTP is already used
    if (otpRecord.isUsed) {
      throw new BadRequestException(RESPONSE_MESSAGES.AUTH.INVALID_OTP);
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      throw new BadRequestException(RESPONSE_MESSAGES.AUTH.INVALID_OTP);
    }

    return otpRecord;
  }

  private transformUserResponse(user: User): UserResponseDto {
    return {
      id: (user as any)._id.toString(),
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      fullName: user.fullName,
      avatar: user.profile?.avatar,
      createdAt: (user as any).createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
