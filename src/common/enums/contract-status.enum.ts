export enum ContractStatus {
  PENDING = 'pending',
  PENDING_PAYMENT = 'pending_payment', // Contract created but payment not completed
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}
