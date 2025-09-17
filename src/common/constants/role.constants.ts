import { UserRole } from '../enums/user-role.enum';

export const ROLE_CONSTANTS = {
  DEFAULT_ROLE: UserRole.FREELANCER,
  
  PERMISSIONS: {
    [UserRole.ADMIN]: [
      'users:read',
      'users:write',
      'users:delete',
      'jobs:read',
      'jobs:write',
      'jobs:delete',
      'payments:read',
      'payments:write',
      'contracts:read',
      'contracts:write',
      'reports:read',
      'disputes:read',
      'disputes:write'
    ],
    [UserRole.CLIENT]: [
      'jobs:read',
      'jobs:write',
      'jobs:delete:own',
      'proposals:read',
      'contracts:read:own',
      'contracts:write:own',
      'payments:read:own',
      'payments:write:own',
      'messages:read:own',
      'messages:write:own',
      'reviews:read',
      'reviews:write:own'
    ],
    [UserRole.FREELANCER]: [
      'jobs:read',
      'proposals:read:own',
      'proposals:write',
      'contracts:read:own',
      'payments:read:own',
      'messages:read:own',
      'messages:write:own',
      'reviews:read',
      'reviews:write:own',
      'skills:read',
      'portfolio:write:own'
    ]
  },

  ROLE_HIERARCHY: {
    [UserRole.ADMIN]: 3,
    [UserRole.CLIENT]: 2,
    [UserRole.FREELANCER]: 1
  }
};