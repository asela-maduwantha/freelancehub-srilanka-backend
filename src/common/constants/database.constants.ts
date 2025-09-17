export const DATABASE_CONSTANTS = {
  CONNECTION_RETRY_ATTEMPTS: 5,
  CONNECTION_RETRY_DELAY: 5000,
  MAX_POOL_SIZE: 10,
  MIN_POOL_SIZE: 1,
  SERVER_SELECTION_TIMEOUT: 5000,
  SOCKET_TIMEOUT: 45000,
  CONNECT_TIMEOUT: 10000,
  HEARTBEAT_FREQUENCY: 10000,
  MAX_IDLE_TIME: 30000,
  
  COLLECTIONS: {
    USERS: 'users',
    JOBS: 'jobs',
    PROPOSALS: 'proposals',
    CONTRACTS: 'contracts',
    PAYMENTS: 'payments',
    MESSAGES: 'messages',
    MILESTONES: 'milestones',
    NOTIFICATIONS: 'notifications',
    REVIEWS: 'reviews',
    CATEGORIES: 'categories',
    SKILLS: 'skills',
    WITHDRAWALS: 'withdrawals',
    TRANSACTION_LOGS: 'transaction_logs',
    OTP_VERIFICATIONS: 'otp_verifications',
    SAVED_JOBS: 'saved_jobs',
    JOB_REPORTS: 'job_reports',
    DISPUTES: 'disputes'
  },

  INDEXES: {
    EMAIL: { email: 1 },
    EMAIL_UNIQUE: { email: 1 },
    USER_ACTIVE: { email: 1, isActive: 1 },
    ROLE_ACTIVE: { role: 1, isActive: 1 },
    CREATED_AT: { createdAt: -1 },
    UPDATED_AT: { updatedAt: -1 },
    STATUS: { status: 1 },
    EXPIRES_AT: { expiresAt: 1 }
  }
};