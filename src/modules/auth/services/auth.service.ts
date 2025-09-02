import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../../common/services/email.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { VerifyOtpDto } from '../dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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

    const user = new this.userModel({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: [role],
      activeRole: role,
      otpCode,
      otpExpiry,
    });

    await user.save();

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

    const payload = { email: user.email, sub: user._id, role: user.activeRole };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('app.refreshTokenExpiresIn'),
    });

    user.lastLogin = new Date();
    await user.save();

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        activeRole: user.activeRole,
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

    if (
      user.otpCode !== otp ||
      !user.otpExpiry ||
      user.otpExpiry < new Date()
    ) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    user.emailVerified = true;
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    user.lastLogin = new Date();
    await user.save();

    const payload = { email: user.email, sub: user._id, role: user.activeRole };
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
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        activeRole: user.activeRole,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userModel.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException();
      }

      const newPayload = {
        email: user.email,
        sub: user._id,
        role: user.activeRole,
      };
      const accessToken = this.jwtService.sign(newPayload);

      return { accessToken };
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

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
