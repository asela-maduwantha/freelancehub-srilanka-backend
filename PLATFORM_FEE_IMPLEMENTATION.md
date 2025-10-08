# Platform Fee Implementation (10%)

## Overview
A 10% platform fee is now automatically added to all contract payments. This document explains the implementation and what the frontend needs to know.

## Backend Changes

### 1. Contract Creation
When a contract is created from a proposal, the system now:
- Calculates a **10% platform fee** on the contract amount
- Stores the platform fee amount in the contract
- Calculates the **total client charge** (contract amount + platform fee)
- Creates a payment intent for the total client charge amount

### 2. Payment Intent
The Stripe payment intent is created with:
- **Amount**: Total client charge (contract amount + 10% platform fee)
- **Metadata**: Includes breakdown of charges for transparency

### 3. Payment Flow
```
Contract Amount: $1000
Platform Fee (10%): $100
Total Client Charge: $1100  ← This is what the client pays
Freelancer Amount: $1000    ← This is what the freelancer receives
```

## Frontend Integration

### Contract Response Structure
When creating a contract, the backend returns:

```typescript
{
  "success": true,
  "message": "Contract created successfully. Note: Total charge includes 10% platform fee.",
  "data": {
    // Standard contract fields
    "_id": "contract_id",
    "totalAmount": 1000,         // Contract amount
    "currency": "usd",
    "platformFeePercentage": 10,
    "platformFeeAmount": 100,    // Calculated platform fee
    "totalClientCharge": 1100,   // Total amount client pays
    
    // Payment breakdown for frontend display
    "paymentBreakdown": {
      "contractAmount": 1000,
      "platformFeePercentage": 10,
      "platformFeeAmount": 100,
      "totalClientCharge": 1100,
      "currency": "usd",
      "note": "Total charge includes 10% platform fee"
    },
    
    // Payment intent information
    "paymentIntent": {
      "id": "pi_xxx",
      "amount": 110000,          // Amount in cents (1100 * 100)
      "currency": "usd",
      "status": "requires_payment_method",
      "clientSecret": "pi_xxx_secret_xxx"
    },
    
    // Other contract fields...
  }
}
```

### Frontend Display Recommendations

#### 1. Contract Creation Screen
Before contract creation, display the cost breakdown:
```
Contract Amount:      $1,000.00
Platform Fee (10%):   +$100.00
─────────────────────────────
Total Charge:         $1,100.00
```

#### 2. Payment Confirmation Screen
When processing payment, show:
```
You are paying: $1,100.00

Breakdown:
• Contract Amount: $1,000.00
• Platform Fee (10%): $100.00
─────────────────────────────
Total: $1,100.00

The freelancer will receive: $1,000.00
```

#### 3. Contract Details Page
Display the payment breakdown in the contract details:
```typescript
// Example React component
function ContractPaymentBreakdown({ contract }) {
  return (
    <div className="payment-breakdown">
      <h3>Payment Details</h3>
      <div className="breakdown-item">
        <span>Contract Amount:</span>
        <span>{formatCurrency(contract.totalAmount, contract.currency)}</span>
      </div>
      <div className="breakdown-item">
        <span>Platform Fee ({contract.platformFeePercentage}%):</span>
        <span>{formatCurrency(contract.platformFeeAmount, contract.currency)}</span>
      </div>
      <div className="breakdown-total">
        <span>Total Charge:</span>
        <span>{formatCurrency(contract.totalClientCharge, contract.currency)}</span>
      </div>
      <div className="breakdown-note">
        <small>{contract.paymentBreakdown.note}</small>
      </div>
    </div>
  );
}
```

### API Endpoints Affected

#### POST /api/contracts
Creates a new contract with platform fee calculation
- Response includes `paymentBreakdown` object
- `totalClientCharge` is the amount to display to the client

#### POST /api/contracts/:id/pay
Initiates payment for a contract
- Payment intent is created with `totalClientCharge` amount
- Client is charged the total including platform fee

### Important Notes for Frontend

1. **Always display `totalClientCharge`** as the amount the client will pay, not just `totalAmount`

2. **Use `paymentBreakdown` object** to show the cost breakdown to users

3. **Currency formatting**: Use the `currency` field to format amounts correctly

4. **Transparency**: Always show the platform fee separately so clients understand the charges

5. **Payment confirmation**: Before submitting payment, confirm the total charge with the user

## Testing

### Test Scenarios

1. **Create Contract with $1000 amount**
   - Expected: `totalClientCharge` = $1100
   - Expected: `platformFeeAmount` = $100

2. **Payment Intent Creation**
   - Expected: Payment intent amount = 110000 cents ($1100)

3. **Payment Record**
   - Expected: Payment description mentions platform fee
   - Expected: Metadata includes charge breakdown

## Migration Notes

For existing contracts created before this implementation:
- Old contracts may not have `platformFeeAmount` and `totalClientCharge` fields
- Frontend should handle these cases gracefully
- Platform fee can be calculated on-the-fly if needed using `totalAmount * (platformFeePercentage / 100)`

## Questions or Issues?

Contact the backend team for any questions about the platform fee implementation.
