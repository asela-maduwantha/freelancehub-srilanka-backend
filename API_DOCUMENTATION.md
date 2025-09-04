# FreelanceHub Backend API Documentation

## Overview
This is a comprehensive API documentation for the FreelanceHub backend, a NestJS-based platform connecting freelancers and clients. The API provides endpoints for user management, project posting, proposal submission, contract management, payments, messaging, reviews, and administrative functions.

## Base URL
```
https://api.freelancehub.com
```

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses are automatically wrapped by a global response interceptor. The standard response format is:

```json
{
  "data": <actual_response_data>,
  "timestamp": "2025-09-04T10:30:00.000Z",
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

- `data`: The actual response data
- `timestamp`: ISO 8601 timestamp of the response
- `meta`: Pagination metadata (only included for paginated responses)

**Note:** Some endpoints may return additional fields like `success` and `message` within the `data` object.

---

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Rate Limit:** 3 attempts per hour

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "freelancer"
}
```

**Response (201):**
```json
{
  "data": {
    "message": "User registered successfully",
    "user": {
      "id": "string",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "freelancer"
    }
  },
  "timestamp": "2025-09-04T10:30:00.000Z"
}
```

**Error Responses:**
- 400: Bad request - validation error
- 409: User already exists

### POST /auth/login
Authenticate user and receive access tokens.

**Rate Limit:** 5 attempts per 15 minutes

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "data": {
    "access_token": "jwt-access-token",
    "refresh_token": "jwt-refresh-token",
    "user": {
      "id": "string",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": ["freelancer"],
      "activeRole": "freelancer"
    }
  },
  "timestamp": "2025-09-04T10:30:00.000Z"
}
```

### POST /auth/verify-otp
Verify email with OTP after registration.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "data": {
    "message": "Email verified successfully",
    "access_token": "jwt-access-token",
    "refresh_token": "jwt-refresh-token",
    "user": { ... }
  },
  "timestamp": "2025-09-04T10:30:00.000Z"
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response (200):**
```json
{
  "data": {
    "access_token": "new-jwt-access-token",
    "refresh_token": "new-jwt-refresh-token"
  },
  "timestamp": "2025-09-04T10:30:00.000Z"
}
```

### POST /auth/logout
Logout user (client-side token removal).

**Response (200):**
```json
{
  "data": {
    "message": "Logged out successfully"
  },
  "timestamp": "2025-09-04T10:30:00.000Z"
}
```

### GET /auth/profile
Get current authenticated user's profile.

**Auth Required:** Yes

**Response (200):**
```json
{
  "data": {
    "id": "string",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": ["freelancer"],
    "activeRole": "freelancer",
    "profilePicture": "url",
    "freelancerProfile": {
      "title": "Full Stack Developer",
      "bio": "Experienced developer...",
      "skills": ["JavaScript", "React"],
      "hourlyRate": 50
    },
    "clientProfile": {
      "companyName": "ABC Corp",
      "industry": "Technology"
    }
  },
  "timestamp": "2025-09-04T10:30:00.000Z"
}
```

---

## Categories Endpoints

### POST /categories
Create a new category (Admin only).

**Auth Required:** Yes (Admin)

**Request Body:**
```json
{
  "name": "Web Development",
  "description": "Web development projects",
  "icon": "web-icon"
}
```

### GET /categories
Get all categories with pagination.

**Query Parameters:**
- page (optional): Page number
- limit (optional): Items per page

**Response (200):**
```json
{
  "data": [
    {
      "id": "string",
      "name": "Web Development",
      "description": "Web development projects",
      "icon": "web-icon",
      "isActive": true
    }
  ],
  "timestamp": "2025-09-04T10:30:00.000Z"
}
```

### GET /categories/popular
Get popular categories.

**Query Parameters:**
- limit (optional): Number of categories to return

### GET /categories/{id}
Get category by ID.

### PATCH /categories/{id}
Update category (Admin only).

### DELETE /categories/{id}
Deactivate category (Admin only).

---

## Clients Endpoints

### GET /clients/projects
Get client's projects.

**Auth Required:** Yes (Client role)

**Query Parameters:**
- page: Page number (default: 1)
- limit: Items per page (default: 10)
- status: Filter by status

### GET /clients/projects/{id}
Get specific client project or all projects if id="my-projects".

### GET /clients/proposals
Get client's received proposals.

### GET /clients/projects/{projectId}/proposals
Get proposals for a specific project.

### POST /clients/projects/{projectId}/proposals/{proposalId}/accept
Accept a proposal.

**Request Body:**
```json
{
  "startDate": "2024-01-15",
  "notes": "Looking forward to working together"
}
```

### GET /clients/dashboard
Get client dashboard data.

---

## Contracts Endpoints

### POST /contracts
Create a new contract.

**Auth Required:** Yes

**Request Body:**
```json
{
  "projectId": "project-id",
  "freelancerId": "freelancer-id",
  "terms": {
    "budget": 1000,
    "paymentType": "fixed",
    "startDate": "2024-01-15",
    "endDate": "2024-02-15"
  },
  "milestones": [
    {
      "title": "Initial Setup",
      "description": "Setup project structure",
      "amount": 300,
      "dueDate": "2024-01-20"
    }
  ]
}
```

### POST /contracts/from-proposal/{proposalId}
Create contract from accepted proposal.

### GET /contracts
Get current user's contracts.

**Response (200):**
```json
{
  "data": [
    {
      "id": "string",
      "title": "Project Title",
      "status": "active",
      "budget": 1000,
      "freelancer": {
        "id": "string",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "client": { ... },
      "milestones": [ ... ]
    }
  ],
  "timestamp": "2025-09-04T10:30:00.000Z"
}
```
```

### GET /contracts/projects/{projectId}
Get contracts by project ID.

### GET /contracts/{id}
Get contract details by ID.

### PUT /contracts/{id}/milestones/{milestoneId}
Update milestone.

### POST /contracts/{id}/milestones/{milestoneId}/submit
Submit work for milestone.

**Request Body:**
```json
{
  "files": ["file1.pdf", "file2.jpg"],
  "description": "Completed the initial setup",
  "feedback": "Please review"
}
```

### POST /contracts/{id}/milestones/{milestoneId}/approve
Approve milestone work.

### POST /contracts/{id}/milestones/{milestoneId}/reject
Reject milestone work.

**Request Body:**
```json
{
  "reason": "Work doesn't meet requirements",
  "feedback": "Please revise the implementation"
}
```

### POST /contracts/{id}/complete
Complete contract.

### POST /contracts/{id}/cancel
Cancel contract.

**Request Body:**
```json
{
  "reason": "Mutual agreement",
  "notes": "Project requirements changed"
}
```

### GET /contracts/{id}/download-pdf
Download contract PDF.

### POST /contracts/{id}/approve/client
Approve contract as client.

### POST /contracts/{id}/approve/freelancer
Approve contract as freelancer.

### GET /contracts/{id}/freelancer-view
Get contract details from freelancer perspective.

---

## Disputes Endpoints

### POST /disputes
Create a new dispute.

**Auth Required:** Yes

**Request Body:**
```json
{
  "contractId": "contract-id",
  "title": "Payment Dispute",
  "description": "Freelancer hasn't delivered work",
  "evidence": ["file1.pdf"]
}
```

### GET /disputes
Get current user's disputes.

### GET /disputes/{id}
Get dispute details by ID.

### POST /disputes/{id}/evidence
Submit evidence for dispute.

**Request Body:**
```json
{
  "description": "Additional evidence",
  "files": ["evidence1.pdf"]
}
```

### POST /disputes/{id}/messages
Add message to dispute.

**Request Body:**
```json
{
  "message": "Please provide more details"
}
```

### PUT /disputes/{id}/status
Update dispute status (Admin only).

### POST /disputes/{id}/resolve
Resolve dispute (Admin only).

**Request Body:**
```json
{
  "resolution": "Refund 50% to client",
  "notes": "Partial refund due to incomplete work"
}
```

### GET /disputes/admin/open
Get all open disputes (Admin only).

---

## Freelancers Endpoints

### GET /freelancers/dashboard
Get freelancer dashboard data.

**Auth Required:** Yes (Freelancer role)

**Response (200):**
```json
{
  "data": {
    "totalProjects": 15,
    "activeProjects": 5,
    "completedProjects": 10,
    "totalEarned": 25000,
    "activeContracts": 3,
    "pendingProposals": 7,
    "recentProjects": [
      {
        "id": "string",
        "title": "E-commerce Website",
        "status": "in-progress",
        "createdAt": "2024-01-01T00:00:00Z",
        "budget": {
          "amount": 5000
        }
      }
    ]
  },
  "timestamp": "2025-09-04T10:30:00.000Z"
}
```

### POST /freelancers/profile
Create freelancer profile.

**Auth Required:** Yes (Freelancer role)

**Response (201):**
```json
{
  "data": {
    "id": "string",
    "title": "Full Stack Developer",
    "bio": "Experienced developer with 5+ years...",
    "skills": ["JavaScript", "React", "Node.js"],
    "hourlyRate": 50,
    "experience": "5+ years",
    "portfolio": ["project1.com", "project2.com"],
    "languages": ["English", "Spanish"]
  },
  "timestamp": "2025-09-04T10:30:00.000Z"
}
```

**Error Responses:**
- 400: Bad request - profile already exists or invalid data
- 401: Unauthorized
- 403: Forbidden - not a freelancer

### PUT /freelancers/profile
Update freelancer profile.

**Auth Required:** Yes (Freelancer role)

**Request Body:** (same as POST, all fields optional for partial updates)

**Response (200):**
```json
{
  "data": {
    "id": "string",
    "title": "Senior Full Stack Developer",
    "bio": "Experienced developer with 5+ years...",
    "skills": ["JavaScript", "React", "Node.js", "TypeScript"],
    "hourlyRate": 60,
    "experience": "5+ years",
    "portfolio": ["project1.com", "project2.com"],
    "languages": ["English", "Spanish"]
  },
  "timestamp": "2025-09-04T10:30:00.000Z"
}
```

**Error Responses:**
- 400: Invalid input data
- 401: Unauthorized
- 403: Forbidden - not a freelancer
- 404: Freelancer not found

---

## Messaging Endpoints

### POST /messaging/conversations
Create a new conversation.

**Auth Required:** Yes

**Rate Limit:** 10 conversations per minute

**Request Body:**
```json
{
  "participant1Id": "user1-id",
  "participant2Id": "user2-id"
}
```

### POST /messaging/encryption/initialize
Initialize encryption for conversation.

**Request Body:**
```json
{
  "conversationId": "conversation-id",
  "publicKey": "user-public-key"
}
```

### POST /messaging/messages
Send a message.

**Rate Limit:** 30 messages per minute

**Headers:**
```
x-conversation-key: <encrypted-key>
```

**Request Body:**
```json
{
  "conversationId": "conversation-id",
  "recipientId": "recipient-id",
  "content": "encrypted-message-content",
  "messageType": "text"
}
```

### GET /messaging/conversations
Get user conversations.

### GET /messaging/conversations/{conversationId}/messages
Get messages for conversation.

**Headers:**
```
x-conversation-key: <encrypted-key>
```

**Query Parameters:**
- page: Page number
- limit: Messages per page

### PUT /messaging/conversations/{conversationId}/read
Mark messages as read.

### GET /messaging/encryption/key/{conversationId}
Get conversation encryption key.

**Headers:**
```
x-private-key: <user-private-key>
```

### POST /messaging/keys/generate
Generate new RSA key pair.

### DELETE /messaging/messages/{messageId}
Delete a message.

---

## Payments Endpoints

### POST /payments/create
Create payment for milestone release.

**Auth Required:** Yes

**Request Body:**
```json
{
  "contractId": "contract-id",
  "milestoneId": "milestone-id",
  "amount": 500,
  "description": "Milestone payment"
}
```

### POST /payments/{id}/confirm
Confirm payment with Stripe.

**Request Body:**
```json
{
  "paymentIntentId": "pi_stripe_payment_intent_id"
}
```

### GET /payments
Get user payments with filtering.

**Query Parameters:**
- status: Filter by payment status
- limit: Limit results
- offset: Pagination offset

### GET /payments/stats
Get payment statistics.

**Response (200):**
```json
{
  "totalPaid": 15000,
  "totalReceived": 12000,
  "pendingPayments": 3,
  "completedPayments": 25,
  "currency": "usd"
}
```

### GET /payments/{id}
Get payment details by ID.

### POST /payments/{id}/refund
Process refund.

**Request Body:**
```json
{
  "reason": "Work not completed"
}
```

### POST /payments/stripe-connect/create
Create Stripe Connect account.

### GET /payments/stripe-connect/status/{accountId}
Get Stripe account status.

### GET /payments/stripe-connect/onboarding-link/{accountId}
Get onboarding link.

### POST /payments/stripe/webhook
Handle Stripe webhooks (No auth required).

---

## Projects Endpoints

### GET /projects
Get projects with filters (public access for open projects).

**Query Parameters:**
- page: Page number (default: 1)
- limit: Items per page (default: 20, max: 50)
- sort: Sort order (newest, oldest, budget-high, budget-low)
- status: Filter by status (open, in-progress, completed)
- category: Filter by category
- minBudget: Minimum budget
- maxBudget: Maximum budget
- skills: Filter by skills (comma-separated)

**Response (200):**
```json
{
  "data": [
    {
      "id": "string",
      "title": "E-commerce Website",
      "description": "Build a modern e-commerce site",
      "budget": 5000,
      "status": "open",
      "category": "Web Development",
      "skills": ["React", "Node.js"],
      "deadline": "2024-02-01T00:00:00Z",
      "client": {
        "id": "string",
        "firstName": "John",
        "lastName": "Client"
      }
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "hasNext": true
  }
}
```

### POST /projects
Create a new project.

**Auth Required:** Yes (Client role)

**Rate Limit:** 5 projects per 5 minutes

**Request Body:**
```json
{
  "title": "E-commerce Website",
  "description": "Build a modern e-commerce platform",
  "category": "Web Development",
  "subcategory": "Full Stack",
  "requiredSkills": ["React", "Node.js", "MongoDB"],
  "type": "fixed",
  "budget": {
    "amount": 5000,
    "currency": "USD",
    "type": "fixed"
  },
  "timeline": {
    "deadline": "2024-02-01",
    "duration": 30,
    "isUrgent": false,
    "isFlexible": true
  },
  "requirements": {
    "experienceLevel": "intermediate",
    "minimumRating": 4.0,
    "minimumCompletedProjects": 5,
    "preferredLanguages": ["English"],
    "preferredCountries": ["USA"]
  },
  "visibility": "public",
  "tags": ["ecommerce", "react"]
}
```

### GET /projects/my-proposals
Get current user's proposals (Freelancer only).

### GET /projects/assigned
Get projects assigned to current freelancer.

### GET /projects/{id}
Get project details by ID.

### PUT /projects/{id}
Update project.

### DELETE /projects/{id}
Delete project.

### POST /projects/{id}/proposals
Submit proposal for project.

**Request Body:**
```json
{
  "coverLetter": "I am excited to work on this project...",
  "pricing": {
    "amount": 4500,
    "currency": "USD",
    "type": "fixed",
    "estimatedHours": 120,
    "breakdown": "Detailed pricing breakdown..."
  },
  "timeline": {
    "deliveryTime": 30,
    "startDate": "2024-01-15",
    "milestones": [
      {
        "title": "Setup and Design",
        "description": "Initial setup and UI design",
        "deliveryDate": "2024-01-20",
        "amount": 1500
      }
    ]
  },
  "portfolioLinks": ["https://portfolio.com/project1"],
  "attachments": [
    {
      "url": "https://example.com/file.pdf",
      "fileType": "application/pdf",
      "fileSize": 1024000,
      "description": "Project proposal document"
    }
  ],
  "additionalInfo": "Additional details about my approach..."
}
```

### GET /projects/{id}/proposals
Get proposals for project.

---

## Proposals Endpoints

### GET /proposals/my
Get current user's proposals (Freelancer only).

**Query Parameters:**
- page: Page number (default: 1)
- limit: Items per page (default: 10)
- status: Filter by status

---

## Reviews Endpoints

### POST /reviews
Create a new review.

**Auth Required:** Yes

**Request Body:**
```json
{
  "contractId": "contract-id",
  "revieweeId": "user-id",
  "rating": 5,
  "comment": "Excellent work, highly recommended!",
  "aspects": {
    "communication": 5,
    "quality": 5,
    "timeliness": 4
  }
}
```

### GET /reviews/user/{userId}
Get reviews for a user.

**Query Parameters:**
- limit: Limit results
- offset: Pagination offset
- rating: Filter by rating

### GET /reviews/user/{userId}/stats
Get review statistics for user.

**Response (200):**
```json
{
  "averageRating": 4.7,
  "totalReviews": 25,
  "ratingDistribution": {
    "1": 0,
    "2": 1,
    "3": 2,
    "4": 5,
    "5": 17
  },
  "recentReviews": [ ... ]
}
```

### GET /reviews/{id}
Get review by ID.

### PUT /reviews/{id}
Update review (reviewer only).

### DELETE /reviews/{id}
Delete review (reviewer only).

### POST /reviews/{id}/respond
Respond to review (reviewee only).

**Request Body:**
```json
{
  "response": "Thank you for the positive feedback!"
}
```

### POST /reviews/{id}/helpful
Mark review as helpful.

---

## Users Endpoints

### PUT /users/profile
Update user profile.

**Auth Required:** Yes

**Rate Limit:** 10 updates per minute

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "profilePicture": "image-url",
  "bio": "Professional bio...",
  "location": {
    "country": "USA",
    "city": "New York"
  }
}
```

### PUT /users/freelancer-profile
Update freelancer profile.

**Auth Required:** Yes (Freelancer role)

### PUT /users/client-profile
Update client profile.

**Auth Required:** Yes (Client role)

### GET /users/freelancers
Get freelancers with filtering.

**Query Parameters:**
- skills: Filter by skills (comma-separated)
- experience: Filter by experience level
- minRate: Minimum hourly rate
- maxRate: Maximum hourly rate
- availability: Filter by availability
- page: Page number
- limit: Items per page

### GET /users/clients
Get clients.

### GET /users/{id}
Get user by ID.

### GET /users/{id}/profile
Get user profile by ID.

### GET /users/{id}/freelancer-profile
Get freelancer profile by ID.

### GET /users/{id}/client-profile
Get client profile by ID.

### POST /users/{id}/follow
Follow a user.

### DELETE /users/{id}/follow
Unfollow a user.

### GET /users/{id}/followers
Get user's followers.

### GET /users/{id}/following
Get users that this user is following.

### GET /users/{id}/analytics
Get user analytics (own analytics only).

**Response (200):**
```json
{
  "overview": {
    "totalProjects": 15,
    "activeProjects": 5,
    "completedProjects": 10,
    "completionRate": 85,
    "avgRating": 4.7
  },
  "financial": {
    "totalEarnings": 25000,
    "totalSpent": 5000,
    "monthlyEarnings": [
      {
        "month": "2024-01",
        "amount": 3000
      }
    ]
  },
  "engagement": {
    "profileViews": 150,
    "profileCompletion": 90,
    "responseRate": 95,
    "responseTime": 2
  },
  "performance": {
    "onTimeDelivery": 88,
    "clientSatisfaction": 92,
    "repeatClients": 3
  },
  "trends": {
    "ratingTrend": [ ... ],
    "activityTrend": [ ... ]
  }
}
```

### GET /users/{id}/analytics/freelancer
Get freelancer-specific analytics.

### GET /users/{id}/analytics/client
Get client-specific analytics.

---

## Admin Endpoints

### GET /admin/dashboard/stats
Get dashboard statistics (Admin only).

**Response (200):**
```json
{
  "totalUsers": 1250,
  "totalProjects": 350,
  "totalContracts": 280,
  "totalRevenue": 125000,
  "activeUsers": 450,
  "pendingProjects": 25,
  "disputedContracts": 8
}
```

### GET /admin/stats/revenue
Get revenue statistics.

**Query Parameters:**
- period: Time period (day, week, month, year)

### GET /admin/stats/users
Get user statistics.

### GET /admin/users
Get all users with pagination and filtering.

**Query Parameters:**
- page: Page number
- limit: Items per page
- role: Filter by role
- status: Filter by status

### GET /admin/users/{id}
Get detailed user information.

### PUT /admin/users/{id}/status
Update user status (Admin only).

**Rate Limit:** 10 status changes per 5 minutes

**Request Body:**
```json
{
  "status": "suspended",
  "reason": "Violation of terms"
}
```

### GET /admin/projects/pending
Get pending projects for approval.

### POST /admin/projects/{id}/approve
Approve pending project.

### POST /admin/projects/{id}/reject
Reject pending project.

**Request Body:**
```json
{
  "reason": "Does not meet platform standards"
}
```

### GET /admin/reports
Get reported content.

### GET /admin/settings
Get system settings.

### PUT /admin/settings
Update system settings.

**Request Body:**
```json
{
  "platformFee": 10,
  "paymentProcessingFee": 2.9,
  "maxFileSize": 10485760,
  "maintenanceMode": false
}
```

### GET /admin/categories
Get available categories.

### PUT /admin/categories
Update categories.

### GET /admin/skills
Get available skills.

### PUT /admin/skills
Update skills.

### GET /admin/fees
Get platform fees.

### PUT /admin/fees
Update platform fees.

### GET /admin/analytics/projects
Get project analytics.

### GET /admin/analytics/contracts
Get contract analytics.

### GET /admin/analytics/payments
Get payment analytics.

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "timestamp": "2025-09-04T10:30:00.000Z",
  "path": "/api/v1/auth/register",
  "method": "POST",
  "error": "Bad Request",
  "message": ["Validation failed"]
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "timestamp": "2025-09-04T10:30:00.000Z",
  "path": "/api/v1/users/profile",
  "method": "GET",
  "error": "Unauthorized",
  "message": ["Unauthorized"]
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "timestamp": "2025-09-04T10:30:00.000Z",
  "path": "/api/v1/admin/users",
  "method": "GET",
  "error": "Forbidden",
  "message": ["Forbidden resource"]
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "timestamp": "2025-09-04T10:30:00.000Z",
  "path": "/api/v1/projects/123",
  "method": "GET",
  "error": "Not Found",
  "message": ["Project not found"]
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "timestamp": "2025-09-04T10:30:00.000Z",
  "path": "/api/v1/auth/register",
  "method": "POST",
  "error": "Conflict",
  "message": ["User already exists"]
}
```

### 429 Too Many Requests
```json
{
  "statusCode": 429,
  "timestamp": "2025-09-04T10:30:00.000Z",
  "path": "/api/v1/auth/login",
  "method": "POST",
  "error": "Too Many Requests",
  "message": ["Too many requests"]
}
```

---

## WebSocket Events

The API also supports real-time communication via WebSockets for messaging and notifications.

### Connection
```
ws://api.freelancehub.com
```

### Authentication
Include JWT token in connection headers:
```
Authorization: Bearer <jwt-token>
```

### Events

#### Message Events
- `message:new` - New message received
- `message:read` - Message marked as read
- `conversation:new` - New conversation created

#### Notification Events
- `notification:new` - New notification
- `notification:read` - Notification marked as read

#### Project Events
- `project:updated` - Project status updated
- `proposal:new` - New proposal received
- `contract:updated` - Contract status changed

---

## File Upload

The API supports file uploads for project attachments, proposal files, contract documents, and profile pictures.

### Supported File Types
- Images: JPG, PNG, GIF (max 5MB)
- Documents: PDF, DOC, DOCX (max 10MB)
- Archives: ZIP, RAR (max 50MB)

### Upload Endpoints
```
POST /files/upload/single
POST /files/upload/multiple
```

**Form Data for single upload:**
- `file`: File to upload

**Form Data for multiple upload:**
- `files`: Files to upload

**Response:**
```json
{
  "fileId": "string",
  "url": "https://cdn.freelancehub.com/files/...",
  "filename": "document.pdf",
  "size": 1024000
}
```

---

## Rate Limiting

The API implements comprehensive rate limiting to ensure fair usage:

- Authentication endpoints: 3-5 requests per time window
- Message sending: 30 messages per minute
- Profile updates: 10 updates per minute
- Project creation: 5 projects per 5 minutes
- Admin actions: 10-20 actions per 5 minutes

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 1640995200
```

---

## Pagination

List endpoints support pagination with the following parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)

**Response Format:**
```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Data Types

### User Roles
- `freelancer`: Can create proposals and work on projects
- `client`: Can post projects and hire freelancers
- `admin`: Has administrative access

### Project Status
- `draft`: Project is being created
- `open`: Project is open for proposals
- `in-progress`: Work is in progress
- `completed`: Project is completed
- `cancelled`: Project is cancelled

### Contract Status
- `active`: Contract is active
- `completed`: Contract is completed
- `cancelled`: Contract is cancelled
- `disputed`: Contract is under dispute

### Payment Status
- `pending`: Payment is pending
- `completed`: Payment is completed
- `failed`: Payment failed
- `refunded`: Payment was refunded

---

## Support

For API support or questions:
- Email: api-support@freelancehub.com
- Documentation: https://docs.freelancehub.com
- Status Page: https://status.freelancehub.com
