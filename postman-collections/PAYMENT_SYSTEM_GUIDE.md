# FreelanceHub Payment System - Postman Collection Guide

## 📖 Overview

This Postman collection provides comprehensive testing for the FreelanceHub payment system, including:
- Payment method management (Stripe integration)
- Payment processing and tracking
- Transaction logs and analytics
- Withdrawal requests and processing
- Stripe webhook handling

---

## 🚀 Quick Start

### 1. Import Collection
1. Open Postman
2. Click **Import** → **File**
3. Select `FreelanceHub-Payment-System.postman_collection.json`
4. Click **Import**

### 2. Configure Variables

The collection uses the following variables (automatically managed):

| Variable | Description | Example |
|----------|-------------|---------|
| `base_url` | API base URL | `http://localhost:3000` |
| `access_token` | User authentication token | Auto-set from auth |
| `admin_token` | Admin authentication token | Set manually |
| `freelancer_token` | Freelancer authentication token | Set manually |
| `payment_method_id` | Saved payment method ID | Auto-set |
| `payment_id` | Created payment ID | Auto-set |
| `payment_intent_id` | Stripe payment intent ID | Auto-set |
| `contract_id` | Contract ID for payments | Set manually |
| `milestone_id` | Milestone ID for payments | Set manually |
| `withdrawal_id` | Withdrawal request ID | Auto-set |
| `transaction_id` | Transaction log ID | Set manually |
| `user_id` | User ID for queries | Set manually |

### 3. Authentication Setup

Before testing payment endpoints:

1. **Login as Client** (for creating payments):
   ```
   POST /auth/login
   Body: { "email": "client@example.com", "password": "password123" }
   ```
   - Token automatically saved to `access_token`

2. **Login as Freelancer** (for withdrawals):
   ```
   POST /auth/login
   Body: { "email": "freelancer@example.com", "password": "password123" }
   ```
   - Manually save token to `freelancer_token`

3. **Login as Admin** (for admin operations):
   ```
   POST /auth/login
   Body: { "email": "admin@example.com", "password": "password123" }
   ```
   - Manually save token to `admin_token`

---

## 📂 Collection Structure

### 1️⃣ Payment Methods (5 requests)
Manage payment methods using Stripe.

#### Typical Flow:
1. **Create Setup Intent** → Returns `client_secret`
2. Use client_secret in frontend to collect payment details
3. **Save Payment Method** → Store Stripe payment method
4. **Set as Default** → Mark as default payment method
5. **Delete** → Remove payment method

**Key Endpoints:**
- `POST /payment-methods/setup-intent` - Get client secret for card collection
- `POST /payment-methods` - Save payment method after collection
- `GET /payment-methods` - List all saved methods
- `POST /payment-methods/:id/default` - Set default
- `DELETE /payment-methods/:id` - Remove method

---

### 2️⃣ Payments (8 requests)
Core payment operations and queries.

#### Create Payment Intent Flow:
```
1. Create Payment Intent
   ↓
2. Use client_secret in frontend (Stripe.js)
   ↓
3. Payment succeeds → Webhook triggered
   ↓
4. View payment details
```

**Key Endpoints:**
- `POST /payments` - Create payment record
- `POST /payments/create-intent` - Create Stripe payment intent
- `GET /payments` - List all payments (with filters)
- `GET /payments/:id` - Get payment details
- `GET /payments/contract/:contractId` - Get contract payments
- `GET /payments/stats/user/:userId/:userType` - Payment statistics
- `GET /payments/balance/:userId` - User balance

**Example: Create Payment Intent**
```json
{
  "contractId": "507f1f77bcf86cd799439011",
  "amount": 10000,
  "currency": "USD",
  "description": "Contract upfront payment",
  "paymentMethodId": "pm_1234567890abcdef"
}
```

---

### 3️⃣ Payment Actions - Admin Only (7 requests)
Administrative payment management.

**Endpoints:**
- `PATCH /payments/:id/process` - Mark as processing
- `PATCH /payments/:id/complete` - Mark as completed (with Stripe IDs)
- `PATCH /payments/:id/fail` - Mark as failed (with error)
- `PATCH /payments/:id/refund` - Refund payment (full/partial)
- `PATCH /payments/:id/retry` - Retry failed payment
- `PUT /payments/:id` - Update payment details
- `DELETE /payments/:id` - Delete payment

**Example: Complete Payment**
```json
{
  "stripePaymentIntentId": "pi_1234567890abcdef",
  "stripeChargeId": "ch_1234567890abcdef",
  "stripeTransferId": "tr_1234567890abcdef",
  "stripeFee": 30
}
```

---

### 4️⃣ Transaction Logs (12 requests)
Track all financial transactions.

**Query Endpoints:**
- `GET /payments/transactions/logs` - All transactions (admin)
- `GET /payments/transactions/:id` - Transaction details
- `GET /payments/transactions/user/:userId` - User transactions
- `GET /payments/transactions/:userId/summary` - User summary
- `GET /payments/transactions/related/:relatedId/:relatedType` - By entity
- `GET /payments/transactions/recent` - Recent transactions
- `GET /payments/transactions/date-range` - Date range analytics
- `GET /payments/transactions/pending` - Pending only
- `GET /payments/transactions/failed` - Failed only
- `GET /payments/transactions/volume-stats` - Volume statistics
- `GET /payments/transactions/search` - Search transactions

**Example: Get User Transaction Summary**
```
GET /payments/transactions/{userId}/summary?startDate=2025-01-01&endDate=2025-12-31

Response:
{
  "totalSent": 50000,
  "totalReceived": 75000,
  "netBalance": 25000,
  "transactionCount": 15,
  "avgTransactionAmount": 5000
}
```

---

### 5️⃣ Transaction Actions - Admin (6 requests)
Manage transaction status and bulk operations.

**Endpoints:**
- `PATCH /transactions/:id/status` - Update by ID
- `PATCH /transactions/by-transaction-id/:transactionId/status` - Update by transaction ID
- `PATCH /transactions/mark-completed/:transactionId` - Mark completed
- `PATCH /transactions/mark-failed/:transactionId` - Mark failed
- `POST /transactions/bulk-update-status` - Bulk status update
- `DELETE /transactions/:id` - Delete transaction

**Example: Bulk Update**
```json
{
  "transactionIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012"
  ],
  "status": "cancelled"
}
```

---

### 6️⃣ Withdrawals (7 requests)
Freelancer withdrawal management.

#### Withdrawal Flow:
```
1. Freelancer Creates Withdrawal Request
   ↓
2. Admin Reviews Request
   ↓
3. Admin Processes (initiates Stripe payout)
   ↓
4. Admin Completes (marks as paid)
   OR
   Admin Fails (with error message)
```

**Endpoints:**
- `POST /withdrawals` - Create request (freelancer)
- `GET /withdrawals` - List withdrawals
- `GET /withdrawals/:id` - Get details
- `PATCH /withdrawals/:id/process` - Process (admin)
- `PATCH /withdrawals/:id/complete` - Complete (admin)
- `PATCH /withdrawals/:id/fail` - Fail (admin)
- `DELETE /withdrawals/:id` - Cancel (admin)

**Example: Create Withdrawal**
```json
{
  "amount": 50000,
  "currency": "USD",
  "withdrawalMethod": "bank_transfer",
  "accountDetails": {
    "accountNumber": "1234567890",
    "routingNumber": "021000021",
    "accountHolderName": "John Doe",
    "bankName": "Example Bank"
  },
  "notes": "Withdrawal for completed projects"
}
```

---

### 7️⃣ Stripe Webhook (1 request)
Handle Stripe webhook events.

**Endpoint:**
- `POST /payments/webhook` - Webhook handler (public)

**Setup:**
1. Configure in Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/payments/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_method.attached`
   - `payout.paid`
   - `payout.failed`

**Important:**
- Endpoint is **public** (no auth required)
- Signature verification enabled (use `stripe-signature` header)
- Set `STRIPE_WEBHOOK_SECRET` in environment variables

---

## 🔄 Common Workflows

### Workflow 1: Client Pays for Contract Upfront

```
1. POST /payment-methods/setup-intent
   → Get client_secret
   
2. [Frontend] Collect card with Stripe.js
   → Get payment_method_id
   
3. POST /payment-methods
   Body: { stripePaymentMethodId, isDefault: true }
   → Save payment method
   
4. POST /payments/create-intent
   Body: { contractId, amount, paymentMethodId }
   → Get payment_intent_id and client_secret
   
5. [Frontend] Confirm payment with Stripe.js
   
6. [Webhook] POST /payments/webhook
   Type: payment_intent.succeeded
   → Payment automatically completed
   
7. GET /payments/contract/{contractId}/total
   → Verify payment received
```

---

### Workflow 2: Milestone Payment Release

```
1. Admin approves milestone completion
   
2. POST /payments
   Body: {
     contractId,
     milestoneId,
     payerId,
     payeeId,
     amount,
     paymentType: "milestone"
   }
   → Create payment record
   
3. PATCH /payments/{id}/process
   → Mark as processing
   
4. [System] Transfer to freelancer via Stripe
   
5. PATCH /payments/{id}/complete
   Body: { stripePaymentIntentId, stripeTransferId }
   → Mark as completed
   
6. GET /payments/transactions/related/{milestoneId}/milestone
   → View transaction history
```

---

### Workflow 3: Freelancer Withdrawal

```
1. Freelancer checks balance
   GET /payments/balance/{userId}
   
2. POST /withdrawals
   Body: { amount, withdrawalMethod, accountDetails }
   → Create withdrawal request
   
3. Admin reviews
   GET /withdrawals
   
4. Admin processes
   PATCH /withdrawals/{id}/process
   Body: { stripePayoutId, processingNotes }
   
5. [Wait for Stripe payout]
   
6. Admin completes
   PATCH /withdrawals/{id}/complete
   
   OR if failed:
   PATCH /withdrawals/{id}/fail
   Body: { errorMessage }
```

---

## 🧪 Testing Scenarios

### Scenario 1: Payment Method Management
1. Create setup intent
2. Save payment method (use test card `4242 4242 4242 4242`)
3. List all methods
4. Set as default
5. Delete method

### Scenario 2: Successful Payment
1. Create payment intent with saved payment method
2. Simulate webhook: `payment_intent.succeeded`
3. Verify payment status
4. Check transaction logs

### Scenario 3: Failed Payment
1. Create payment intent
2. Use test card that declines (`4000 0000 0000 0002`)
3. Simulate webhook: `payment_intent.payment_failed`
4. Retry payment
5. Check failed transactions

### Scenario 4: Refund
1. Create and complete payment
2. Admin initiates refund (full or partial)
3. Check refund status
4. Verify transaction logs show refund

### Scenario 5: Withdrawal Processing
1. Freelancer creates withdrawal
2. Admin processes with Stripe payout ID
3. Admin completes withdrawal
4. Check user balance updated

---

## 🎯 Stripe Test Cards

Use these test cards in development:

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 0069` | Charge expires |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

**Expiry**: Any future date  
**CVC**: Any 3 digits  
**ZIP**: Any 5 digits

---

## 🔐 Authentication & Permissions

### Required Roles by Endpoint:

| Endpoint | Client | Freelancer | Admin |
|----------|--------|------------|-------|
| Payment Methods | ✅ | ✅ | ✅ |
| Create Payment | ✅ | ✅ | ❌ |
| View Payments | ✅ (own) | ✅ (own) | ✅ (all) |
| Payment Actions | ❌ | ❌ | ✅ |
| Create Withdrawal | ❌ | ✅ | ❌ |
| Process Withdrawal | ❌ | ❌ | ✅ |
| Transaction Logs | ✅ (own) | ✅ (own) | ✅ (all) |
| Transaction Actions | ❌ | ❌ | ✅ |

---

## 💡 Tips & Best Practices

### 1. Environment Variables
Set these in your Postman environment:
```
base_url = http://localhost:3000
access_token = [from login]
admin_token = [from admin login]
```

### 2. Auto-Save IDs
The collection automatically saves IDs from responses:
- `payment_method_id` from save payment method
- `payment_id` from create payment
- `payment_intent_id` from create intent
- `withdrawal_id` from create withdrawal

### 3. Testing in Order
Follow this sequence for best results:
1. Payment Methods → Payments → Withdrawals
2. Create resources before testing queries
3. Test admin actions after regular operations

### 4. Webhook Testing
Use Stripe CLI for local webhook testing:
```bash
stripe listen --forward-to localhost:3000/payments/webhook
stripe trigger payment_intent.succeeded
```

### 5. Error Handling
Check these when requests fail:
- Valid authentication token
- Correct user role
- Required IDs exist (contract, milestone, etc.)
- Stripe test mode enabled
- Valid test card numbers

---

## 📊 Response Examples

### Payment Intent Response
```json
{
  "success": true,
  "data": {
    "id": "pi_1234567890abcdef",
    "clientSecret": "pi_1234567890abcdef_secret_xyz",
    "amount": 10000,
    "currency": "usd",
    "status": "requires_confirmation",
    "metadata": {
      "contractId": "507f1f77bcf86cd799439011"
    }
  }
}
```

### Transaction Summary Response
```json
{
  "totalSent": 50000,
  "totalReceived": 75000,
  "netBalance": 25000,
  "transactionCount": 15,
  "completedCount": 12,
  "pendingCount": 2,
  "failedCount": 1,
  "avgTransactionAmount": 5000,
  "largestTransaction": 15000,
  "smallestTransaction": 1000
}
```

### Withdrawal Response
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "freelancerId": "507f1f77bcf86cd799439012",
  "amount": 50000,
  "currency": "USD",
  "status": "pending",
  "withdrawalMethod": "bank_transfer",
  "accountDetails": {
    "accountNumber": "****7890",
    "bankName": "Example Bank"
  },
  "createdAt": "2025-10-01T10:00:00Z"
}
```

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" Error
**Solution**: 
- Check authentication token is set
- Ensure token hasn't expired
- Verify user role matches endpoint requirements

### Issue: "Payment Method Not Found"
**Solution**:
- Create setup intent first
- Save payment method with valid Stripe ID
- Check payment_method_id variable is set

### Issue: "Insufficient Funds" on Withdrawal
**Solution**:
- Check user balance: `GET /payments/balance/:userId`
- Ensure withdrawal amount ≤ available balance

### Issue: Webhook Signature Verification Failed
**Solution**:
- Set `STRIPE_WEBHOOK_SECRET` in .env
- Use correct Stripe signature header
- For testing: Set `STRIPE_SKIP_SIGNATURE_VERIFICATION=true`

---

## 📞 Support

For issues or questions:
- Check the main API documentation
- Review Stripe API docs: https://stripe.com/docs/api
- Consult the backend error logs

---

**Last Updated**: October 1, 2025  
**Collection Version**: 1.0  
**API Version**: Compatible with FreelanceHub Backend v1.0
