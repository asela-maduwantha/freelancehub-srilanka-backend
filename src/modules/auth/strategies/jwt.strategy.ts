import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from '../services/token-blacklist.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string[];
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {
    const jwtSecret = configService.get<string>('app.jwtSecret');
    
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is required but not provided in configuration');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      passReqToCallback: true, // Pass request to validate method
    });
  }

  async validate(request: any, payload: JwtPayload) {
    // Extract token from authorization header
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    // Check if token is blacklisted
    const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been invalidated');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      tokenIssuedAt: payload.iat,
    };
  }
}
