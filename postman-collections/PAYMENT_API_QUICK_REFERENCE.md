# Payment System API Quick Reference

## 🔗 Base URL
```
http://localhost:3000
```

## 🔑 Authentication
All endpoints require Bearer token except webhook:
```
Authorization: Bearer {access_token}
```

---

## 📋 Quick Endpoint Reference

### Payment Methods
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payment-methods/setup-intent` | User | Create setup intent |
| POST | `/payment-methods` | User | Save payment method |
| GET | `/payment-methods` | User | List all methods |
| POST | `/payment-methods/:id/default` | User | Set as default |
| DELETE | `/payment-methods/:id` | User | Delete method |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payments` | User | Create payment |
| POST | `/payments/create-intent` | User | Create payment intent |
| GET | `/payments` | User | List payments |
| GET | `/payments/:id` | User | Get payment |
| GET | `/payments/contract/:contractId` | User | Get contract payments |
| GET | `/payments/contract/:contractId/total` | User | Get total paid |
| GET | `/payments/stats/user/:userId/:userType` | User | Payment stats |
| GET | `/payments/balance/:userId` | User | User balance |

### Payment Actions (Admin Only)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PATCH | `/payments/:id/process` | Admin | Process payment |
| PATCH | `/payments/:id/complete` | Admin | Complete payment |
| PATCH | `/payments/:id/fail` | Admin | Fail payment |
| PATCH | `/payments/:id/refund` | Admin | Refund payment |
| PATCH | `/payments/:id/retry` | Admin | Retry payment |
| PUT | `/payments/:id` | Admin | Update payment |
| DELETE | `/payments/:id` | Admin | Delete payment |

### Transaction Logs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/payments/transactions/logs` | Admin | All transactions |
| GET | `/payments/transactions/:id` | Admin | Get transaction |
| GET | `/payments/transactions/user/:userId` | User | User transactions |
| GET | `/payments/transactions/:userId/summary` | User | User summary |
| GET | `/payments/transactions/recent` | User | Recent transactions |
| GET | `/payments/transactions/pending` | Admin | Pending only |
| GET | `/payments/transactions/failed` | Admin | Failed only |
| GET | `/payments/transactions/search` | Admin | Search transactions |

### Withdrawals
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/withdrawals` | Freelancer | Create request |
| GET | `/withdrawals` | User | List withdrawals |
| GET | `/withdrawals/:id` | User | Get withdrawal |
| PATCH | `/withdrawals/:id/process` | Admin | Process withdrawal |
| PATCH | `/withdrawals/:id/complete` | Admin | Complete withdrawal |
| PATCH | `/withdrawals/:id/fail` | Admin | Fail withdrawal |
| DELETE | `/withdrawals/:id` | Admin | Cancel withdrawal |

### Webhook
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payments/webhook` | Public | Stripe webhook |

---

## 💳 Test Cards (Stripe)

| Card | Scenario |
|------|----------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0000 0000 0002` | ❌ Declined |
| `4000 0000 0000 9995` | ❌ Insufficient funds |
| `4000 0025 0000 3155` | 🔐 Requires 3D Secure |

**Expiry**: Any future date | **CVC**: Any 3 digits

---

## 📊 Common Request Bodies

### Create Payment Intent
```json
{
  "contractId": "507f1f77bcf86cd799439011",
  "amount": 10000,
  "currency": "USD",
  "description": "Contract payment",
  "paymentMethodId": "pm_1234567890abcdef"
}
```

### Save Payment Method
```json
{
  "stripePaymentMethodId": "pm_1234567890abcdef",
  "isDefault": true
}
```

### Create Payment
```json
{
  "contractId": "507f1f77bcf86cd799439011",
  "milestoneId": "507f1f77bcf86cd799439012",
  "payerId": "507f1f77bcf86cd799439013",
  "payeeId": "507f1f77bcf86cd799439014",
  "amount": 5000,
  "currency": "USD",
  "paymentType": "milestone",
  "platformFeePercentage": 10
}
```

### Create Withdrawal
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
  }
}
```

### Complete Payment (Admin)
```json
{
  "stripePaymentIntentId": "pi_1234567890abcdef",
  "stripeChargeId": "ch_1234567890abcdef",
  "stripeFee": 30
}
```

### Refund Payment (Admin)
```json
{
  "refundAmount": 5000
}
```

---

## 🔄 Payment Workflow

```
1. Setup Intent → 2. Save Method → 3. Create Intent → 4. Confirm → 5. Webhook
```

## 🔄 Withdrawal Workflow

```
1. Create Request → 2. Admin Process → 3. Stripe Payout → 4. Admin Complete
```

---

## 📈 Status Values

### Payment Status
- `pending` - Awaiting processing
- `processing` - Being processed
- `completed` - Successfully completed
- `failed` - Processing failed
- `refunded` - Fully refunded

### Withdrawal Status
- `pending` - Awaiting admin review
- `processing` - Being processed by admin
- `completed` - Successfully paid out
- `failed` - Payout failed
- `cancelled` - Cancelled by admin

### Transaction Status
- `pending` - Not yet processed
- `completed` - Successfully processed
- `failed` - Processing failed
- `cancelled` - Cancelled

---

## 🎯 Query Parameters

### Pagination
```
?page=1&limit=10&sortBy=createdAt&sortOrder=desc
```

### Filters
```
?status=completed&paymentType=milestone
```

### Date Range
```
?startDate=2025-01-01&endDate=2025-12-31
```

### Transaction Types
```
?type=from   (sent)
?type=to     (received)
?type=both   (all)
```

---

## ⚡ Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## 🔐 Role Permissions

| Action | Client | Freelancer | Admin |
|--------|--------|------------|-------|
| Manage Payment Methods | ✅ | ✅ | ✅ |
| Create Payment | ✅ | ✅ | ❌ |
| View Own Payments | ✅ | ✅ | ✅ |
| View All Payments | ❌ | ❌ | ✅ |
| Process Payments | ❌ | ❌ | ✅ |
| Create Withdrawal | ❌ | ✅ | ❌ |
| Process Withdrawal | ❌ | ❌ | ✅ |
| View Transaction Logs | ✅* | ✅* | ✅ |
| Manage Transactions | ❌ | ❌ | ✅ |

*Own transactions only

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check token & expiry |
| 403 Forbidden | Verify user role |
| Payment Method Not Found | Create setup intent first |
| Insufficient Funds | Check user balance |
| Webhook Signature Failed | Set `STRIPE_WEBHOOK_SECRET` |

---

## 📞 Webhook Events

Configure in Stripe Dashboard:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_method.attached`
- `payout.paid`
- `payout.failed`

**Webhook URL**: `https://your-domain.com/payments/webhook`

---

## 💡 Tips

1. **Always create setup intent before saving payment method**
2. **Use payment intent for new payments, not direct charges**
3. **Check balance before creating withdrawal**
4. **Admin must process withdrawals manually**
5. **Use test cards in development**
6. **Amounts are in cents (e.g., $100 = 10000)**

---

**Version**: 1.0  
**Last Updated**: October 1, 2025
