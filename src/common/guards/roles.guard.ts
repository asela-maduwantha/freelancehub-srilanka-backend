import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (UserRole | 'self')[]) =>
  SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.get<(UserRole | 'self')[]>(
        ROLES_KEY,
        context.getHandler(),
      ) ||
      this.reflector.get<(UserRole | 'self')[]>(ROLES_KEY, context.getClass());

    if (!requiredRoles) {
      return true; // No roles required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check for 'self' access (user accessing their own resources)
    if (requiredRoles.includes('self')) {
      const resourceUserId = request.params.id || request.params.userId;

      // Allow search requests for authenticated users
      if (resourceUserId === 'search') {
        return true;
      }

      if (resourceUserId && user.userId === resourceUserId) {
        return true;
      }
    }

    // Check for admin access
    if (user.role === 'admin') {
      return true;
    }

    // Check for specific role access
    const hasRole = requiredRoles.some(
      (role) => role !== 'self' && user.role === role,
    );

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
