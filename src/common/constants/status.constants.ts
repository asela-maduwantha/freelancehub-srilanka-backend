export const STATUS_CONSTANTS = {
  USER: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING_VERIFICATION: 'pending_verification'
  },

  JOB: {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    DISPUTED: 'disputed'
  },

  PROPOSAL: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    WITHDRAWN: 'withdrawn'
  },

  CONTRACT: {
    PENDING: 'pending',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    DISPUTED: 'disputed'
  },

  PAYMENT: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    DISPUTED: 'disputed'
  },

  MILESTONE: {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    PAID: 'paid'
  },

  DISPUTE: {
    OPEN: 'open',
    IN_REVIEW: 'in_review',
    RESOLVED: 'resolved',
    CLOSED: 'closed'
  },

  WITHDRAWAL: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  },

  NOTIFICATION: {
    UNREAD: 'unread',
    READ: 'read',
    ARCHIVED: 'archived'
  }
};