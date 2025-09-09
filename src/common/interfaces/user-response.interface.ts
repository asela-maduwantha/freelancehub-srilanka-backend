export interface StandardUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  profilePicture?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
}

export interface AuthUserResponse extends StandardUserResponse {
  // Additional auth-specific fields can be added here
}

export interface SafeUserResponse extends Omit<StandardUserResponse, 'email'> {
  // For public user displays without sensitive data
}

// Utility function to create standardized user response
export function createUserResponse(user: any): StandardUserResponse {
  return {
    id: user._id || user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    role: user.role,
    profilePicture: user.profilePicture,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
  };
}

// Utility function to create safe user response (no email)
export function createSafeUserResponse(user: any): SafeUserResponse {
  const standardResponse = createUserResponse(user);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { email, ...safeResponse } = standardResponse;
  return safeResponse;
}
