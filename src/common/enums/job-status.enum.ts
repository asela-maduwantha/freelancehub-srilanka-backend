export enum JobStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  AWAITING_CONTRACT = 'awaiting-contract', // Proposal accepted, contract not yet created
  CONTRACTED = 'contracted', // Contract created and active
  IN_PROGRESS = 'in-progress', // Work is actively being done (legacy status, consider using CONTRACTED)
  UNDER_REVIEW = 'under-review', // Work submitted, awaiting client review
  COMPLETED = 'completed', // Successfully completed with payment
  CLOSED = 'closed', // Manually closed by client without completion
  CANCELLED = 'cancelled', // Cancelled by either party
}
