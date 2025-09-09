# FreelanceHub API Documentation

## Overview
Comprehensive API reference for FreelanceHub.

- Base URL: http://localhost:8000/api/v1
- Docs (Swagger UI): http://localhost:8000/api/v1/docs
- Auth: JWT Bearer in Authorization header
- Content-Type: application/json
- Roles: single role string per user: "freelancer" or "client" (not both)

## Global response and errors

- Success envelope (applied by global interceptor):
  - Single resource: { data: <object>, timestamp }
  - Lists usually return: { data: { itemsKey..., pagination... } , timestamp }
  - Note: Some services return { projects, pagination } or { data, pagination }. The interceptor wraps the whole object under data without flattening. Examples below clarify per endpoint.

- Error envelope (global exception filter):
  {
    statusCode: number,
    timestamp: string,
    path: string,
    method: string,
    error: string,            // Exception name or label
    message: string[]         // One or more messages
  }

## Security and platform
- HTTPS enforced in production.
- Helmet and security headers enabled.
- CORS enabled; default origin http://localhost:3000 (configurable).
- Request size limit: 10mb (configurable).
- Rate limiting guard applied per-endpoint (see Rate limits).

## Rate limits (selected)
- POST /auth/register: 3/hour
- POST /auth/login: 5/15min (account lockout after too many failures)
- POST /auth/forgot-password: 3/hour
- POST /auth/verify-otp: 10/min
- POST /projects: 5/5min
- Profile create/update: commonly 10/min (guarded where annotated)

## 1) Authentication

All responses are wrapped by the global interceptor.

### 1.1 Register
- POST /auth/register
- Body
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "abc12345$",
  "role": "client"
}
```
- 201 Response
```json
{
  "data": {
    "message": "Registration successful. Please verify your email with the OTP sent."
  },
  "timestamp": "2025-09-09T10:00:00.000Z"
}
```

### 1.2 Verify OTP
- POST /auth/verify-otp
- Body
```json
{ "email": "jane@example.com", "otp": "123456" }
```
- 200 Response
```json
{
  "data": {
    "message": "Email verified successfully",
    "access_token": "<jwt>",
    "refresh_token": "<jwt>",
    "user": {
      "id": "66df...",
      "email": "jane@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "fullName": "Jane Doe",
      "role": "client",
      "profilePicture": null,
      "isActive": true,
      "emailVerified": true,
      "lastLoginAt": "2025-09-09T10:00:00.000Z"
    }
  },
  "timestamp": "2025-09-09T10:00:01.000Z"
}
```

### 1.3 Login
- POST /auth/login
- Body
```json
{ "email": "jane@example.com", "password": "abc12345$" }
```
- 200 Response
```json
{
  "data": {
    "access_token": "<jwt>",
    "refresh_token": "<jwt>",
    "user": {
      "id": "66df...",
      "email": "jane@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "fullName": "Jane Doe",
      "role": "client",
      "emailVerified": true
    }
  },
  "timestamp": "2025-09-09T10:05:00.000Z"
}
```

### 1.4 Refresh token
- POST /auth/refresh
- Body
```json
{ "refreshToken": "<jwt>" }
```
- 200 Response
```json
{
  "data": {
    "access_token": "<jwt>",
    "refresh_token": "<jwt>"
  },
  "timestamp": "2025-09-09T10:06:00.000Z"
}
```

### 1.5 Logout
- POST /auth/logout
- Headers: Authorization: Bearer <access_token>
- 200 Response
```json
{ "data": { "message": "Logged out successfully" }, "timestamp": "2025-09-09T10:07:00.000Z" }
```

### 1.6 Forgot password
- POST /auth/forgot-password
- Body
```json
{ "email": "jane@example.com" }
```
- 200 Response
```json
{ "data": { "message": "Password reset email sent successfully" }, "timestamp": "2025-09-09T10:08:00.000Z" }
```

### 1.7 Reset password
- POST /auth/reset-password
- Body
```json
{ "token": "<reset_token>", "newPassword": "NewPass123$" }
```
- 200 Response
```json
{ "data": { "message": "Password reset successfully" }, "timestamp": "2025-09-09T10:10:00.000Z" }
```

### 1.8 Get my profile
- GET /auth/profile
- Headers: Authorization: Bearer <access_token>
- 200 Response
```json
{
  "data": {
    "_id": "66df...",
    "email": "jane@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "client",
    "emailVerified": true,
    "profilePicture": null,
    "clientProfile": null,
    "freelancerProfile": null
  },
  "timestamp": "2025-09-09T10:11:00.000Z"
}
```

## 2) Users and Profiles
Controller: users

### 2.1 Update my base profile
- PUT /users/profile (JWT)
- Body
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+94112223344",
  "profilePicture": "https://example.com/pic.jpg"
}
```
- 200 Response
```json
{ "data": { "_id": "66df...", "firstName": "Jane", "lastName": "Doe", "phone": "+94112223344" }, "timestamp": "2025-09-09T10:12:00.000Z" }
```

### 2.2 Create client profile
- POST /users/client-profile (JWT, role=client)
- Body
```json
{
  "companyName": "Acme Inc",
  "industry": "Technology",
  "companySize": "11-50",
  "website": "https://acme.example",
  "description": "We build products.",
  "location": { "country": "LK", "city": "Colombo", "province": "Western" }
}
```
- 201 Response
```json
{
  "data": {
    "success": true,
    "data": {
      "_id": "66e0...",
      "userId": "66df...",
      "companyName": "Acme Inc",
      "industry": "Technology",
      "companySize": "11-50",
      "website": "https://acme.example",
      "description": "We build products.",
      "location": { "country": "LK", "city": "Colombo", "province": "Western" },
      "createdAt": "2025-09-09T10:13:00.000Z",
      "updatedAt": "2025-09-09T10:13:00.000Z"
    },
    "message": "Client profile created successfully"
  },
  "timestamp": "2025-09-09T10:13:00.000Z"
}
```

### 2.3 Update client profile
- PUT /users/client-profile (JWT, role=client)
- Body (any updatable field)
```json
{ "description": "Updated description" }
```
- 200 Response
```json
{ "data": { "_id": "66e0...", "description": "Updated description" }, "timestamp": "2025-09-09T10:14:00.000Z" }
```

### 2.4 Upsert freelancer profile
- PUT /users/freelancer-profile (JWT, role=freelancer)
- Body (subset shown)
```json
{
  "professionalTitle": "Full Stack Developer",
  "description": "Experienced in NestJS",
  "skills": ["NestJS", "TypeScript"],
  "categories": ["Web Development"],
  "experienceLevel": "intermediate",
  "hourlyRate": 25,
  "availability": {
    "status": "available",
    "hoursPerWeek": 40,
    "workingHours": { "timezone": "Asia/Colombo", "schedule": { "monday": ["09:00","17:00"] } }
  },
  "location": { "country": "LK", "city": "Kandy", "province": "Central" },
  "publicProfileUrl": "jane-dev"
}
```
- 200 Response
```json
{ "data": { "_id": "66e1...", "userId": "66df...", "hourlyRate": 25 }, "timestamp": "2025-09-09T10:15:00.000Z" }
```

## 3) Freelancers
Controller: freelancers

### 3.1 Create profile (alt path)
- POST /freelancers/profile (JWT, role=freelancer)
- Body: same as 2.4
- 201 Response
```json
{ "data": { "_id": "66e1...", "userId": "66df..." }, "timestamp": "2025-09-09T10:16:00.000Z" }
```

### 3.2 Dashboard
- GET /freelancers/dashboard (JWT)
- 200 Response
```json
{
  "data": { "totalProjects": 15, "activeProjects": 5, "completedProjects": 10, "totalEarned": 25000 },
  "timestamp": "2025-09-09T10:17:00.000Z"
}
```

## 4) Projects and Proposals
Controller: projects (also available under freelancers/projects for some GETs)

### 4.1 List projects
- GET /projects
- Query: page, limit(<=50), status, category, skills, minBudget, maxBudget, sortBy, sortOrder
- 200 Response
```json
{
  "data": {
    "projects": [
      {
        "_id": "66p1...",
        "title": "Web App",
        "description": "Build a web app",
        "status": "open",
        "visibility": "public",
        "clientId": "66df...",
        "requiredSkills": [{ "skill": "NestJS", "level": "intermediate" }],
        "budgetType": "fixed",
        "budget": 500,
        "currency": "USD"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 150, "pages": 8 }
  },
  "timestamp": "2025-09-09T10:18:00.000Z"
}
```

### 4.2 Create project
- POST /projects (JWT, role=client)
- Body
```json
{
  "title": "Marketplace MVP",
  "description": "Build an MVP",
  "category": "technology",
  "subcategory": "web-development",
  "requiredSkills": ["JavaScript", "NestJS"],
  "type": "fixed",
  "budget": { "amount": 5000, "currency": "USD", "type": "fixed" },
  "timeline": { "deadline": "2025-12-31", "duration": 60, "isUrgent": false, "isFlexible": true },
  "requirements": { "experienceLevel": "intermediate" },
  "visibility": "public",
  "tags": ["urgent"]
}
```
- 201 Response
```json
{ "data": { "_id": "66p2...", "title": "Marketplace MVP", "status": "open", "clientId": "66df..." }, "timestamp": "2025-09-09T10:19:00.000Z" }
```

### 4.3 Get project by id
- GET /projects/:id (JWT)
- 200 Response
```json
{ "data": { "_id": "66p2...", "title": "Marketplace MVP", "status": "open" }, "timestamp": "2025-09-09T10:20:00.000Z" }
```

### 4.4 Update project
- PUT /projects/:id (JWT; owner; status=open)
- Body (partial)
```json
{ "description": "Updated scope", "budget": { "amount": 6000, "currency": "USD", "type": "fixed" } }
```
- 200 Response
```json
{ "data": { "_id": "66p2...", "description": "Updated scope", "budget": { "amount": 6000, "currency": "USD", "type": "fixed" } }, "timestamp": "2025-09-09T10:21:00.000Z" }
```

### 4.5 Delete project
- DELETE /projects/:id (JWT; owner; status=open)
- 200 Response
```json
{ "data": "Project deleted successfully", "timestamp": "2025-09-09T10:22:00.000Z" }
```

### 4.6 Assigned projects (freelancer)
- GET /projects/assigned (JWT, role=freelancer)
- 200 Response
```json
{ "data": { "projects": [ { "_id": "66p3...", "status": "active" } ], "pagination": { "page": 1, "limit": 10, "total": 5, "pages": 1 } }, "timestamp": "2025-09-09T10:23:00.000Z" }
```

### 4.7 My proposals (freelancer)
- GET /projects/my-proposals (JWT, role=freelancer)
- 200 Response
```json
{ "data": { "proposals": [ { "_id": "66pr...", "status": "submitted" } ], "total": 7, "page": 1, "limit": 10 }, "timestamp": "2025-09-09T10:24:00.000Z" }
```

### 4.8 Submit proposal
- POST /projects/:id/proposals (JWT)
- Body
```json
{
  "coverLetter": "I can do this...",
  "pricing": { "amount": 4500, "currency": "USD", "type": "fixed", "estimatedHours": 80 },
  "timeline": {
    "deliveryTime": 25,
    "startDate": "2025-09-15",
    "milestones": [
      { "title": "Frontend", "description": "UI work", "deliveryDate": "2025-10-01", "amount": 2000 },
      { "title": "Backend", "description": "API work", "deliveryDate": "2025-10-15", "amount": 2500 }
    ]
  },
  "portfolioLinks": ["https://portfolio.example/work"],
  "attachments": [ { "url": "https://files.example/doc.pdf", "fileType": "application/pdf", "fileSize": 84211 } ]
}
```
- 201 Response
```json
{ "data": { "_id": "66pr...", "projectId": "66p2...", "status": "submitted" }, "timestamp": "2025-09-09T10:25:00.000Z" }
```

### 4.9 Proposals for a project (client owner)
- GET /projects/:id/proposals (JWT)
- 200 Response
```json
{ "data": [ { "_id": "66pr...", "freelancerId": "66ff...", "status": "submitted" } ], "timestamp": "2025-09-09T10:26:00.000Z" }
```

Proposals controller
- GET /proposals/my (JWT, role=freelancer)
- 200 Response
```json
{ "data": { "proposals": [ { "_id": "66pr..." } ], "total": 7, "page": 1, "limit": 10 }, "timestamp": "2025-09-09T10:27:00.000Z" }
```

## 5) Clients
Controller: clients

- GET /clients/projects (JWT, role=client)
- GET /clients/projects/:id (JWT, role=client)
- GET /clients/proposals (JWT, role=client)
- GET /clients/projects/:projectId/proposals (JWT, role=client)
- POST /clients/projects/:projectId/proposals/:proposalId/accept (JWT, role=client)
- GET /clients/dashboard (JWT, role=client)
- GET /clients/submitted-milestones (JWT, role=client)

## 6) Categories
Controller: categories

- POST /categories (JWT, role=admin)
- GET /categories
- GET /categories/popular
- GET /categories/:id
- PATCH /categories/:id (JWT, role=admin)
- DELETE /categories/:id (JWT, role=admin)

## 7) Skills
Controller: skills

- GET /skills
- GET /skills/categories
- GET /skills/:id
- POST /skills (JWT, role=admin)
- PUT /skills/:id (JWT, role=admin)
- DELETE /skills/:id (JWT, role=admin)
- GET /skills/popular/top

## 8) Saved projects (bookmarks)
Controller: saved-projects (JWT)

- POST /saved-projects/:projectId
- GET /saved-projects
- GET /saved-projects/check/:projectId
- DELETE /saved-projects/:projectId
- GET /saved-projects/stats/count

## 9) Messaging
Controller: messaging (JWT). Special headers: some routes require x-conversation-key or x-private-key.

### 9.1 Create conversation
- POST /messaging/conversations
- Body
```json
{ "participant2Id": "66u2..." }
```
- 201 Response
```json
{ "data": { "conversationId": "conv_66u1_66u2", "participants": ["66u1","66u2"], "createdAt": "2025-09-09T10:28:00.000Z" }, "timestamp": "2025-09-09T10:28:00.000Z" }
```

### 9.2 Initialize encryption
- POST /messaging/encryption/initialize
- Body
```json
{ "conversationId": "conv_66u1_66u2", "publicKey": "-----BEGIN PUBLIC KEY-----..." }
```
- 200 Response
```json
{ "data": { "conversationKey": { "version": "v1", "algorithm": "RSA+AES" }, "encryptedKeyShare": "<base64>" }, "timestamp": "2025-09-09T10:29:00.000Z" }
```

### 9.3 Send message
- POST /messaging/messages
- Headers: x-conversation-key: <key>
- Body
```json
{ "conversationId": "conv_66u1_66u2", "recipientId": "66u2...", "content": "Hello" }
```
- 201 Response
```json
{ "data": { "messageId": "66m1...", "status": "sent", "createdAt": "2025-09-09T10:30:00.000Z" }, "timestamp": "2025-09-09T10:30:00.000Z" }
```

### 9.4 Get conversations
- GET /messaging/conversations
- 200 Response
```json
{ "data": [ { "conversationId": "conv_66u1_66u2", "participants": ["66u1","66u2"], "lastMessageAt": "2025-09-09T10:31:00.000Z", "lastMessagePreview": "Hello" } ], "timestamp": "2025-09-09T10:31:00.000Z" }
```

### 9.5 Get messages
- GET /messaging/conversations/:conversationId/messages
- Headers: x-conversation-key: <key>
- Query: page, limit
- 200 Response
```json
{ "data": [ { "id": "66m1...", "senderId": "66u1...", "recipientId": "66u2...", "content": "<encrypted>", "status": "delivered" } ], "timestamp": "2025-09-09T10:32:00.000Z" }
```

### 9.6 Mark read
- PUT /messaging/conversations/:conversationId/read
- 200 Response
```json
{ "data": "Messages marked as read", "timestamp": "2025-09-09T10:33:00.000Z" }
```

### 9.7 Get encryption key
- GET /messaging/encryption/key/:conversationId
- Headers: x-private-key: <pem>
- 200 Response
```json
{ "data": { "key": "<decrypted-key>" }, "timestamp": "2025-09-09T10:34:00.000Z" }
```

### 9.8 Delete message
- DELETE /messaging/messages/:messageId
- 200 Response
```json
{ "data": "Message deleted successfully", "timestamp": "2025-09-09T10:35:00.000Z" }
```

## 10) Notifications
Controller: notifications (JWT)

- POST /notifications
- GET /notifications
- PUT /notifications/:id/read
- PUT /notifications/read-all
- DELETE /notifications/:id
- GET /notifications/unread-count
- PUT /notifications/fcm-token
- PUT /notifications/preferences
- GET /notifications/preferences

## 11) Payments
Payment methods controller (JWT)

### 11.1 Setup customer
- POST /payment-methods/setup-customer
- 201 Response
```json
{ "data": { "customerId": "cus_123" }, "timestamp": "2025-09-09T10:36:00.000Z" }
```

### 11.2 Create connected account
- POST /payment-methods/create-connected-account
- 201 Response
```json
{ "data": { "accountId": "acct_123", "onboardingUrl": "https://connect.stripe.com/..." }, "timestamp": "2025-09-09T10:37:00.000Z" }
```

### 11.3 Add payment method
- POST /payment-methods/add
- Body
```json
{ "paymentMethodId": "pm_123", "setAsDefault": true }
```
- 201 Response
```json
{ "data": { "id": "pm_123", "brand": "visa", "last4": "4242", "isDefault": true }, "timestamp": "2025-09-09T10:38:00.000Z" }
```

### 11.4 List payment methods
- GET /payment-methods
- 200 Response
```json
{ "data": [ { "id": "pm_123", "brand": "visa", "last4": "4242", "isDefault": true } ], "timestamp": "2025-09-09T10:39:00.000Z" }
```

### 11.5 Delete payment method
- DELETE /payment-methods/:paymentMethodId
- 200 Response
```json
{ "data": { "message": "Payment method removed successfully" }, "timestamp": "2025-09-09T10:40:00.000Z" }
```

### 11.6 Set default
- PUT /payment-methods/:paymentMethodId/default
- 200 Response
```json
{ "data": { "message": "Payment method set as default successfully" }, "timestamp": "2025-09-09T10:41:00.000Z" }
```

### 11.7 Create payment intent
- POST /payment-methods/create-payment-intent
- Body
```json
{ "amount": "5000", "currency": "USD", "description": "Milestone #1" }
```
- 201 Response
```json
{ "data": { "paymentIntentId": "pi_123", "clientSecret": "pi_123_secret_..." }, "timestamp": "2025-09-09T10:42:00.000Z" }
```

### 11.8 Debug stripe
- GET /payment-methods/debug-stripe
- 200 Response
```json
{ "data": { "userId": "66df...", "hasStripeCustomer": true, "savedPaymentMethodsCount": 1 }, "timestamp": "2025-09-09T10:43:00.000Z" }
```

Payments controller (JWT)
- GET /payments/user
- GET /payments/:id
- GET /payments/debug/all

Stripe webhook (no auth; raw body)
- POST /payments/stripe/webhook

## 12) Contracts
Controller: contracts (JWT)

- POST /contracts
- POST /contracts/from-proposal/:proposalId
- GET /contracts
- GET /contracts/projects/:projectId
- GET /contracts/:id
- PUT /contracts/:id/milestones/:milestoneId
- POST /contracts/:id/milestones/:milestoneId/submit
- PUT /contracts/:id/milestones/:milestoneId/approve
- GET /contracts/:id/milestones/:milestoneId/setup-payment
- POST /contracts/:id/milestones/:milestoneId/reject
- GET /contracts/payment-methods/default
- POST /contracts/:id/complete
- POST /contracts/:id/cancel
- POST /contracts/:id/approve/client
- POST /contracts/:id/approve/freelancer
- GET /contracts/:id/freelancer-view
- GET /contracts/:id/download-pdf
- POST /contracts/:id/sign/client
- POST /contracts/:id/sign/freelancer

## 13) Disputes
Controller: disputes (JWT)

- POST /disputes
- GET /disputes
- GET /disputes/:id
- POST /disputes/:id/evidence
- POST /disputes/:id/messages
- PUT /disputes/:id/status
- POST /disputes/:id/resolve
- GET /disputes/admin/open (JWT, role=admin)

## 14) Reviews
Controller: reviews (JWT)

- POST /reviews
- GET /reviews/user/:userId
- GET /reviews/user/:userId/stats
- GET /reviews/:id
- PUT /reviews/:id
- DELETE /reviews/:id
- POST /reviews/:id/respond
- POST /reviews/:id/helpful

## 15) Storage (file uploads)
Controller: files (JWT)

- POST /files/upload/single
- POST /files/upload/multiple

## 16) Admin
Controller: admin (JWT, role=admin)

- GET /admin/dashboard/stats
- GET /admin/stats/revenue
- GET /admin/stats/users
- GET /admin/users
- GET /admin/users/:id
- PUT /admin/users/:id/status
- GET /admin/projects/pending
- POST /admin/projects/:id/approve
- POST /admin/projects/:id/reject
- GET /admin/reports
- GET /admin/settings
- PUT /admin/settings
- GET /admin/categories
- PUT /admin/categories
- GET /admin/skills
- PUT /admin/skills
- GET /admin/fees
- PUT /admin/fees
- GET /admin/analytics/projects
- GET /admin/analytics/contracts
- GET /admin/analytics/payments

## Examples

Auth login success
```json
{
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "...", "fullName": "...", "role": "freelancer", "emailVerified": true }
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

Projects list success
```json
{
  "data": {
    "projects": [ { "_id": "...", "title": "...", "status": "open" } ],
    "pagination": { "page": 1, "limit": 20, "total": 150, "pages": 8 }
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

Error example (unauthorized)
```json
{
  "statusCode": 401,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/v1/projects",
  "method": "GET",
  "error": "Unauthorized",
  "message": ["Unauthorized"]
}
```

Notes
- Prefer Swagger at /api/v1/docs for live schemas/examples derived from code.
- Some controller Swagger schemas may show arrays for role; actual runtime user.role is a single string as enforced by the schema and user response builder.

## 11.1a Example: Setup milestone payment (contracts)

- GET /contracts/:id/milestones/:milestoneId/setup-payment (JWT)
- 200 Response (saved cards flow)
```json
{
  "data": {
    "hasSavedCards": true,
    "paymentMethods": [
      { "id": "pm_123", "type": "card", "last4": "4242", "brand": "visa", "isDefault": true }
    ],
    "requiresSetup": false
  },
  "timestamp": "2025-09-09T10:44:00.000Z"
}
```
- 200 Response (needs setup flow)
```json
{
  "data": {
    "hasSavedCards": false,
    "setupIntent": { "clientSecret": "seti_secret_...", "id": "seti_123" },
    "requiresSetup": true
  },
  "timestamp": "2025-09-09T10:44:05.000Z"
}
```

## 12) Contracts – detailed requests

### 12.1 Create contract
- POST /contracts (JWT)
- Body (CreateContractDto)
```json
{
  "projectId": "66p2...",
  "proposalId": "66pr...",
  "terms": {
    "budget": 5000,
    "type": "fixed",
    "startDate": "2025-09-15",
    "endDate": "2025-12-31",
    "paymentSchedule": "Milestone-based"
  },
  "milestones": [
    { "title": "Phase 1", "description": "Design", "amount": 1500, "dueDate": "2025-10-01" },
    { "title": "Phase 2", "description": "Development", "amount": 3500, "dueDate": "2025-11-15" }
  ]
}
```
- 201 Response (shape condensed)
```json
{ "data": { "_id": "66c1...", "status": "active", "milestones": [ { "title": "Phase 1" } ] }, "timestamp": "2025-09-09T10:45:00.000Z" }
```

### 12.2 Update milestone
- PUT /contracts/:id/milestones/:milestoneId (JWT)
- Body (UpdateMilestoneDto)
```json
{ "description": "Updated scope", "amount": 1600, "dueDate": "2025-10-05" }
```
- 200 Response
```json
{ "data": { "message": "Milestone updated successfully" }, "timestamp": "2025-09-09T10:46:00.000Z" }
```

### 12.3 Submit milestone work
- POST /contracts/:id/milestones/:milestoneId/submit (JWT, freelancer)
- Body (SubmitMilestoneDto)
```json
{ "description": "Delivered designs", "files": ["https://files.example/design.pdf"] }
```
- 200 Response
```json
{ "data": { "message": "Work submitted successfully" }, "timestamp": "2025-09-09T10:47:00.000Z" }
```

### 12.4 Approve milestone
- PUT /contracts/:id/milestones/:milestoneId/approve (JWT, client)
- Body (ApproveMilestoneDto)
```json
{ "feedback": "Looks great", "paymentMethodId": "pm_123", "processPayment": true }
```
- 200 Response
```json
{ "data": { "message": "Milestone approved successfully" }, "timestamp": "2025-09-09T10:48:00.000Z" }
```

### 12.5 Reject milestone
- POST /contracts/:id/milestones/:milestoneId/reject (JWT, client)
- Body (RejectMilestoneDto)
```json
{ "feedback": "Needs revisions", "revisionRequest": "Adjust layout" }
```
- 200 Response
```json
{ "data": { "message": "Milestone rejected successfully" }, "timestamp": "2025-09-09T10:49:00.000Z" }
```

### 12.6 Get default payment method
- GET /contracts/payment-methods/default (JWT)
- 200 Response
```json
{ "data": { "defaultPaymentMethod": { "id": "pm_123", "brand": "visa", "last4": "4242", "isDefault": true } }, "timestamp": "2025-09-09T10:50:00.000Z" }
```

### 12.7 Complete contract
- POST /contracts/:id/complete (JWT)
- 200 Response
```json
{ "data": { "message": "Contract completed successfully" }, "timestamp": "2025-09-09T10:51:00.000Z" }
```

### 12.8 Cancel contract
- POST /contracts/:id/cancel (JWT)
- Body (CancelContractDto)
```json
{ "reason": "Requirements changed" }
```
- 200 Response
```json
{ "data": { "message": "Contract cancelled successfully" }, "timestamp": "2025-09-09T10:52:00.000Z" }
```

### 12.9 Download contract PDF
- GET /contracts/:id/download-pdf (JWT)
- 200 Response: application/pdf (binary); Content-Disposition: attachment

### 12.10 Sign contract
- POST /contracts/:id/sign/client (JWT, client)
- POST /contracts/:id/sign/freelancer (JWT, freelancer)
- 200 Response
```json
{ "data": { "message": "Contract signed by client successfully" }, "timestamp": "2025-09-09T10:53:00.000Z" }
```

## 13) Disputes – detailed requests

### 13.1 Create dispute
- POST /disputes (JWT)
- Body (CreateDisputeDto)
```json
{
  "contractId": "66c1...",
  "reason": "Scope disagreement",
  "description": "Client requested major changes outside scope",
  "evidence": [ { "description": "Email thread", "files": ["https://files.example/email.pdf"] } ]
}
```
- 201 Response
```json
{ "data": { "id": "66d1...", "status": "open" }, "timestamp": "2025-09-09T10:54:00.000Z" }
```

### 13.2 Get my disputes
- GET /disputes (JWT)
- 200 Response
```json
{ "data": [ { "id": "66d1...", "title": "Scope issue", "status": "open" } ], "timestamp": "2025-09-09T10:55:00.000Z" }
```

### 13.3 Get dispute by id
- GET /disputes/:id (JWT)
- 200 Response
```json
{
  "data": {
    "id": "66d1...",
    "title": "Scope issue",
    "description": "...",
    "status": "open",
    "messages": [ { "id": "m1", "message": "Please clarify", "senderId": "u1" } ],
    "evidence": [ { "id": "e1", "description": "Email thread", "fileUrl": "https://..." } ]
  },
  "timestamp": "2025-09-09T10:56:00.000Z"
}
```

### 13.4 Submit evidence
- POST /disputes/:id/evidence (JWT)
- Body (SubmitEvidenceDto)
```json
{ "description": "Screenshots", "files": ["https://files.example/shot.png"] }
```
- 201 Response
```json
{ "data": { "message": "Evidence submitted successfully" }, "timestamp": "2025-09-09T10:57:00.000Z" }
```

### 13.5 Add message
- POST /disputes/:id/messages (JWT)
- Body (AddMessageDto)
```json
{ "message": "We can compromise on timeline." }
```
- 201 Response
```json
{ "data": { "message": "Message added successfully" }, "timestamp": "2025-09-09T10:58:00.000Z" }
```

### 13.6 Update dispute status
- PUT /disputes/:id/status (JWT; authorized roles)
- Body (UpdateDisputeStatusDto)
```json
{ "status": "under-review" }
```
- 200 Response
```json
{ "data": { "message": "Dispute status updated successfully" }, "timestamp": "2025-09-09T10:59:00.000Z" }
```

### 13.7 Resolve dispute
- POST /disputes/:id/resolve (JWT; authorized roles)
- Body (ResolveDisputeDto)
```json
{ "decision": "Partial refund", "refundAmount": 200 }
```
- 200 Response
```json
{ "data": { "message": "Dispute resolved successfully" }, "timestamp": "2025-09-09T11:00:00.000Z" }
```

### 13.8 Open disputes (admin)
- GET /disputes/admin/open (JWT, admin)
- 200 Response
```json
{ "data": [ { "id": "66d1...", "status": "open" } ], "timestamp": "2025-09-09T11:01:00.000Z" }
```

## 14) Reviews – detailed requests

### 14.1 Create review
- POST /reviews (JWT)
- Body (CreateReviewDto)
```json
{
  "revieweeId": "66u2...",
  "projectId": "66p2...",
  "rating": 5,
  "review": "Outstanding work",
  "reviewType": "client",
  "criteria": [ { "category": "communication", "rating": 5 } ],
  "visibility": "public"
}
```
- 201 Response
```json
{ "data": { "id": "66rv...", "rating": 5, "comment": "Outstanding work" }, "timestamp": "2025-09-09T11:02:00.000Z" }
```

### 14.2 Get reviews for user
- GET /reviews/user/:userId?limit=10&offset=0&rating=5 (JWT)
- 200 Response
```json
{ "data": [ { "id": "66rv...", "rating": 5, "comment": "Great" } ], "timestamp": "2025-09-09T11:03:00.000Z" }
```

### 14.3 Stats
- GET /reviews/user/:userId/stats (JWT)
- 200 Response
```json
{ "data": { "averageRating": 4.8, "totalReviews": 25, "ratingDistribution": { "5": 20, "4": 4, "3": 1 }, "recentReviews": [] }, "timestamp": "2025-09-09T11:04:00.000Z" }
```

### 14.4 Get review by id
- GET /reviews/:id (JWT)
- 200 Response
```json
{ "data": { "id": "66rv...", "rating": 5, "comment": "..." }, "timestamp": "2025-09-09T11:05:00.000Z" }
```

### 14.5 Update review
- PUT /reviews/:id (JWT, reviewer)
- Body (partial CreateReviewDto)
```json
{ "review": "Updated review text" }
```
- 200 Response
```json
{ "data": { "message": "Review updated successfully" }, "timestamp": "2025-09-09T11:06:00.000Z" }
```

### 14.6 Delete review
- DELETE /reviews/:id (JWT, reviewer)
- 200 Response
```json
{ "data": "Review deleted successfully", "timestamp": "2025-09-09T11:07:00.000Z" }
```

### 14.7 Respond to review
- POST /reviews/:id/respond (JWT, reviewee)
- Body
```json
{ "response": "Thanks for the feedback!" }
```
- 200 Response
```json
{ "data": { "message": "Response added successfully" }, "timestamp": "2025-09-09T11:08:00.000Z" }
```

### 14.8 Mark helpful
- POST /reviews/:id/helpful (JWT)
- 200 Response
```json
{ "data": "Review marked as helpful", "timestamp": "2025-09-09T11:09:00.000Z" }
```

## 15) Notifications – detailed requests

### 15.1 Create notification
- POST /notifications (JWT)
- Body (CreateNotificationDto)
```json
{
  "userId": "66u2...",
  "type": "message",
  "title": "New Message",
  "content": "You have a new message",
  "relatedEntity": { "entityType": "message", "entityId": "66m1..." },
  "priority": "medium"
}
```
- 201 Response
```json
{ "data": { "id": "66n1...", "title": "New Message", "isRead": false }, "timestamp": "2025-09-09T11:10:00.000Z" }
```

### 15.2 List notifications
- GET /notifications?page=1&limit=20&isRead=false (JWT)
- 200 Response
```json
{ "data": { "notifications": [ { "id": "66n1...", "title": "New Message" } ], "total": 5, "unreadCount": 3 }, "timestamp": "2025-09-09T11:11:00.000Z" }
```

### 15.3 Mark as read
- PUT /notifications/:id/read (JWT)
- 200 Response
```json
{ "data": { "message": "Notification marked as read" }, "timestamp": "2025-09-09T11:12:00.000Z" }
```

### 15.4 Mark all as read
- PUT /notifications/read-all (JWT)
- 200 Response
```json
{ "data": { "message": "All notifications marked as read" }, "timestamp": "2025-09-09T11:13:00.000Z" }
```

### 15.5 Delete notification
- DELETE /notifications/:id (JWT)
- 200 Response
```json
{ "data": { "message": "Notification deleted successfully" }, "timestamp": "2025-09-09T11:14:00.000Z" }
```

### 15.6 Unread count
- GET /notifications/unread-count (JWT)
- 200 Response
```json
{ "data": { "unreadCount": 3 }, "timestamp": "2025-09-09T11:15:00.000Z" }
```

### 15.7 Update FCM token
- PUT /notifications/fcm-token (JWT)
- Body
```json
{ "fcmToken": "fcm_abc" }
```
- 200 Response
```json
{ "data": { "message": "FCM token updated successfully" }, "timestamp": "2025-09-09T11:16:00.000Z" }
```

### 15.8 Preferences
- PUT /notifications/preferences (JWT)
- Body
```json
{ "emailNotifications": true, "pushNotifications": true, "messageNotifications": true, "proposalNotifications": true, "paymentNotifications": true }
```
- 200 Response
```json
{ "data": { "message": "Notification preferences updated successfully" }, "timestamp": "2025-09-09T11:17:00.000Z" }
```
- GET /notifications/preferences (JWT)
- 200 Response
```json
{ "data": { "emailNotifications": true, "pushNotifications": true, "messageNotifications": true, "proposalNotifications": true, "paymentNotifications": true }, "timestamp": "2025-09-09T11:18:00.000Z" }
```

## 16) Storage – detailed requests

### 16.1 Single file upload
- POST /files/upload/single (JWT)
- Content-Type: multipart/form-data (fields: file[binary], folder[string?])
- 201 Response (runtime shape)
```json
{
  "data": {
    "url": "https://.../contracts/myfile.pdf",
    "fileName": "myfile.pdf",
    "mimeType": "application/pdf",
    "size": 102400
  },
  "timestamp": "2025-09-09T11:19:00.000Z"
}
```
Note: The Swagger decorator references UploadResponseDto, but the controller returns FileDataDto wrapped by the global interceptor.

### 16.2 Multiple files upload
- POST /files/upload/multiple (JWT)
- Content-Type: multipart/form-data (fields: files[binary[]], folder[string?])
- 201 Response (runtime shape)
```json
{
  "data": [
    { "url": "https://.../general/a.png", "fileName": "a.png", "mimeType": "image/png", "size": 23456 },
    { "url": "https://.../general/b.pdf", "fileName": "b.pdf", "mimeType": "application/pdf", "size": 91234 }
  ],
  "timestamp": "2025-09-09T11:20:00.000Z"
}
```

## 17) Admin – examples

### 17.1 Dashboard stats
- GET /admin/dashboard/stats (JWT, admin)
- 200 Response
```json
{ "data": { "totalUsers": 1000, "totalProjects": 250, "disputedContracts": 3 }, "timestamp": "2025-09-09T11:21:00.000Z" }
```

### 17.2 List users
- GET /admin/users?page=1&limit=20&role=freelancer&status=active (JWT, admin)
- 200 Response
```json
{ "data": { "users": [ { "id": "66u1...", "email": "user@example.com", "role": "freelancer" } ], "total": 200, "page": 1, "limit": 20 }, "timestamp": "2025-09-09T11:22:00.000Z" }
```

### 17.3 Pending projects
- GET /admin/projects/pending (JWT, admin)
- 200 Response
```json
{ "data": [ { "id": "66p1...", "title": "Pending App", "status": "pending" } ], "timestamp": "2025-09-09T11:23:00.000Z" }
```

### 17.4 Approve/Reject project
- POST /admin/projects/:id/approve (JWT, admin) — 200 { message }
- POST /admin/projects/:id/reject (JWT, admin)
- Body
```json
{ "reason": "Insufficient details" }
```
- 200 { message }
