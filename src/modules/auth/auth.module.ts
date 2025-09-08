import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User, UserSchema } from '../../schemas/user.schema';
import { Otp, OtpSchema } from '../../schemas/otp.schema';
import { TokenBlacklist, TokenBlacklistSchema } from '../../schemas/token-blacklist.schema';
import { UsersModule } from '../users/users.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          secret: configService.get<string>('app.jwtSecret'),
          signOptions: {
            expiresIn: configService.get<string>('app.jwtExpiresIn'),
          },
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Otp.name, schema: OtpSchema },
      { name: TokenBlacklist.name, schema: TokenBlacklistSchema },
    ]),
    UsersModule, // Import UsersModule instead of providing UsersService directly
    CommonModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenBlacklistService, JwtStrategy],
  exports: [AuthService, TokenBlacklistService, JwtModule],
})
export class AuthModule {}
