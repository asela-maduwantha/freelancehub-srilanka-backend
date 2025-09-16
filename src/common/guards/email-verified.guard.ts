import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RESPONSE_MESSAGES } from '../constants/response-messages';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new UnauthorizedException(RESPONSE_MESSAGES.AUTH.UNAUTHORIZED);
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        RESPONSE_MESSAGES.AUTH.EMAIL_NOT_VERIFIED,
      );
    }

    return true;
  }
}
