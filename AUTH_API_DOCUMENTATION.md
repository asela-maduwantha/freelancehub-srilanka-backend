# FreelanceHub Authentication API Documentation

## Overview
This document provides comprehensive documentation for the authentication endpoints in the FreelanceHub backend API. All endpoints are prefixed with `/api/v1/auth` and the base URL is `http://localhost:8000/api/v1`.

## Authentication Flow
1. **Register** → User receives OTP via email
2. **Verify OTP** → Account activated, tokens issued
3. **Login** → Direct login for verified users
4. **Refresh Token** → Extend session
5. **Logout** → Invalidate session
6. **Profile** → Get user information (requires authentication)

## Endpoints

### 1. Register User
**Endpoint:** `POST /api/v1/auth/register`  
**Rate Limit:** 3 requests per hour  
**Content-Type:** `application/json`

#### Request Body
```json
{
  "firstName": "string",     // Required, min: 1 char
  "lastName": "string",      // Required, min: 1 char
  "email": "string",         // Required, valid email format
  "password": "string",      // Required, min: 8 chars, pattern: /^(?=.*[a-z])(?=.*[A-Z])?(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  "role": "string"           // Required, enum: ["freelancer", "client"]
}
```

#### Success Response (201)
```json
{
  "message": "Registration successful. Please verify your email with the OTP sent."
}
```

#### Error Responses
- **400 Bad Request:** Validation errors
- **409 Conflict:** User already exists
- **429 Too Many Requests:** Rate limit exceeded

---

### 2. Login User
**Endpoint:** `POST /api/v1/auth/login`  
**Rate Limit:** 5 requests per 15 minutes  
**Content-Type:** `application/json`

#### Request Body
```json
{
  "email": "string",         // Required, valid email format
  "password": "string"       // Required
}
```

#### Success Response (200)
```json
{
  "access_token": "string",  // JWT token, expires in 30 minutes
  "refresh_token": "string", // JWT token, expires in 7 days
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",         // Full name (firstName + lastName)
    "role": "string"          // Single role string
  }
}
```

#### Error Responses
- **401 Unauthorized:** Invalid credentials
- **429 Too Many Requests:** Rate limit exceeded

---

### 3. Verify OTP
**Endpoint:** `POST /api/v1/auth/verify-otp`  
**Content-Type:** `application/json`

#### Request Body
```json
{
  "email": "string",         // Required, valid email format
  "otp": "string"            // Required, exactly 6 digits
}
```

#### Success Response (200)
```json
{
  "message": "Email verified successfully",
  "access_token": "string",  // JWT token, expires in 30 minutes
  "refresh_token": "string", // JWT token, expires in 7 days
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",         // Full name (firstName + lastName)
    "role": "string"          // Single role string
  }
}
```

#### Error Responses
- **400 Bad Request:** Invalid OTP or validation errors

---

### 4. Refresh Access Token
**Endpoint:** `POST /api/v1/auth/refresh`  
**Content-Type:** `application/json`

#### Request Body
```json
{
  "refreshToken": "string"   // Required, valid refresh token
}
```

#### Success Response (200)
```json
{
  "accessToken": "string"  // New JWT token, expires in 30 minutes
}
```

#### Error Responses
- **401 Unauthorized:** Invalid refresh token

---

### 5. Logout User
**Endpoint:** `POST /api/v1/auth/logout`  
**Content-Type:** `application/json`

#### Request Body
```json
// No body required
```

#### Success Response (200)
```json
{
  "message": "Logged out successfully"
}
```

---

### 6. Get User Profile
**Endpoint:** `GET /api/v1/auth/profile`  
**Authorization:** Required (`Bearer <access_token>`)

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Success Response (200)
```json
{
  "id": "string",
  "email": "string",
  "name": "string",         // Full name
  "profilePicture": "string", // URL to profile picture (optional)
  "role": "string",         // User role
  "emailVerified": "boolean",
  "lastLoginAt": "string",  // ISO date string
  "isActive": "boolean",
  "createdAt": "string",    // ISO date string
  "updatedAt": "string"     // ISO date string
}
```

#### Error Responses
- **401 Unauthorized:** Invalid or missing access token

---

## Security Features

### JWT Tokens
- **Access Token:** Expires in 30 minutes
- **Refresh Token:** Expires in 7 days
- Tokens use HS256 algorithm with secret from environment

### Rate Limiting
- Register: 3 requests per hour
- Login: 5 requests per 15 minutes

### CORS Configuration
- Origin: Configurable via `CORS_ORIGIN` environment variable
- Credentials: Enabled
- Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Headers: Content-Type, Authorization, Accept

### Security Headers
- Helmet.js enabled
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

---

## Environment Variables
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=30m
REFRESH_TOKEN_EXPIRES_IN=7d

# OTP Configuration
OTP_EXPIRY=600  # 10 minutes in seconds

# App Configuration
PORT=8000
CORS_ORIGIN=http://localhost:3000
```

---

## Frontend Integration Examples

### JavaScript (Fetch API)
```javascript
const API_BASE = 'http://localhost:8000/api/v1';

// Register
async function register(userData) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return response.json();
}

// Login
async function login(credentials) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  const data = await response.json();
  if (data.access_token) {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
  }
  return data;
}

// Authenticated request
async function getProfile() {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_BASE}/auth/profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

// Refresh Token
async function refreshToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  const data = await response.json();
  if (data.accessToken) {
    localStorage.setItem('access_token', data.accessToken);
  }
  return data;
}
```

### TypeScript (Axios)
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' }
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Register
export const register = (data: RegisterDto) =>
  api.post('/auth/register', data);

// Login
export const login = (data: LoginDto) =>
  api.post('/auth/login', data);

// Get profile
export const getProfile = () =>
  api.get('/auth/profile');

// Refresh token
export const refreshToken = (refreshToken: string) =>
  api.post('/auth/refresh', { refreshToken });
```

---

## Error Handling
All endpoints return standardized error responses:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

For validation errors:
```json
{
  "statusCode": 400,
  "message": [
    "firstName should not be empty",
    "email must be a valid email"
  ],
  "error": "Bad Request"
}
```

---

## API Documentation
Complete Swagger documentation is available at:
`http://localhost:8000/api/v1/docs`

## Testing
Use the following curl commands for testing:

```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "role": "freelancer"
  }'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# Get Profile
curl -X GET http://localhost:8000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Refresh Token
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```</content>
<parameter name="filePath">c:\Users\dilsh\OneDrive\Desktop\freelance\freelancehub-backend\AUTH_API_DOCUMENTATION.md
