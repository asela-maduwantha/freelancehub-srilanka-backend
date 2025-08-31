# Freelance Hub Backend - Registration and Profile Creation Endpoints

## Overview
This document outlines the API endpoints for user registration and profile creation in the Freelance Hub backend. The system supports two user types: **Freelancer** and **Client**. Registration is handled through the Auth module, while profile updates are managed through the Users module.

## Complete Profile Creation Flow

### For Freelancer:
1. **Register:** POST /api/auth/register with role: "freelancer" → **Returns message only (no tokens)**
2. **Verify OTP (if required):** POST /api/auth/verify-otp → **Returns access_token, refresh_token, and user data**
3. **Use tokens immediately** for authenticated requests (no separate login needed)
4. **Get Current Profile:** GET /api/users/profile
5. **Update General Profile:** PUT /api/users/profile with basic info
6. **Update Freelancer Profile:** PUT /api/users/freelancer-profile with professional details

### For Client:
1. **Register:** POST /api/auth/register with role: "client" → **Returns message only (no tokens)**
2. **Verify OTP (if required):** POST /api/auth/verify-otp → **Returns access_token, refresh_token, and user data**
3. **Use tokens immediately** for authenticated requests (no separate login needed)
4. **Get Current Profile:** GET /api/users/profile
5. **Update General Profile:** PUT /api/users/profile with basic info
6. **Update Client Profile:** PUT /api/users/client-profile with company details

**Base URL:** `http://localhost:8000/api` (assuming default port)

## Authentication Headers

All protected endpoints require JWT authentication. After successful login, include the access token in the Authorization header:

```
Authorization: Bearer <your_jwt_token_here>
```

Example:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Troubleshooting Authentication

### 401 Unauthorized Error
If you get a 401 error on protected endpoints:

1. **Missing Authorization Header:** Make sure to include the Authorization header
2. **Invalid Token:** Ensure you're using the `access_token` from login response
3. **Expired Token:** Tokens expire (default: 15 minutes). Use refresh token to get new access token
4. **Wrong Format:** Header should be `Authorization: Bearer <token>`

### Token Refresh
When access token expires, use the refresh token:

**POST /api/auth/refresh**
```json
{
  "refreshToken": "your_refresh_token_here"
}
```

## Registration Endpoint

### POST /api/auth/register
**Description:** Register a new user (Freelancer or Client)

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "role": "freelancer" // or "client"
}
```

#### Response (Success - 201)
```json
{
  "message": "Registration successful. Please verify your email with the OTP sent."
}
```

**Note:** Registration does NOT return JWT tokens. You must verify your email with OTP to get tokens.

#### Response (Error - 400)
```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "role must be one of the following values: freelancer, client"
  ],
  "error": "Bad Request"
}
```

#### Response (Conflict - 409)
```json
{
  "statusCode": 409,
  "message": "User already exists",
  "error": "Conflict"
}
```

## Additional Authentication Endpoints

### POST /api/auth/login
**Description:** Login user

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Response (Success - 200)
```json
{
  "access_token": "jwt_token_here",
  "refresh_token": "refresh_token_here",
  "user": {
    "id": "user_id_here",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": ["freelancer"]
  }
}
```

### POST /api/auth/verify-otp
**Description:** Verify OTP for user registration

#### Request Body
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

#### Response (Success - 200)
```json
{
  "message": "Email verified successfully",
  "access_token": "jwt_token_here",
  "refresh_token": "refresh_token_here",
  "user": {
    "id": "user_id_here",
    "email": "user@example.com",
    "firstName": null,
    "lastName": null,
    "role": ["freelancer"],
    "activeRole": "freelancer"
  }
}
```

**Note:** OTP verification now returns JWT tokens and user data, so you can immediately use the tokens for authenticated requests without a separate login call.

#### Response (Error - 400)
```json
{
  "statusCode": 400,
  "message": "Invalid OTP",
  "error": "Bad Request"
}
```

### POST /api/auth/refresh
**Description:** Refresh access token

#### Request Body
```json
{
  "refreshToken": "your_refresh_token_here"
}
```

#### Response (Success - 200)
```json
{
  "access_token": "new_jwt_token_here",
  "refresh_token": "new_refresh_token_here"
}
```

#### Response (Error - 401)
```json
{
  "statusCode": 401,
  "message": "Invalid refresh token",
  "error": "Unauthorized"
}
```

### GET /api/auth/profile
**Description:** Get current user profile  
**Authentication:** Required (Bearer Token)

#### Response (Success - 200)
```json
{
  "id": "user_id_here",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": ["freelancer"],
  "activeRole": "freelancer"
}
```

#### Response (Error - 401)
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### GET /api/users/profile
**Description:** Get current user profile with detailed information  
**Authentication:** Required (Bearer Token)

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

#### Response (Success - 200)
```json
{
  "id": "user_id_here",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": ["freelancer"],
  "activeRole": "freelancer",
  "profilePicture": "https://example.com/picture.jpg",
  "freelancerProfile": {
    "title": "Full Stack Developer",
    "bio": "Experienced developer",
    "skills": ["JavaScript", "React"],
    "hourlyRate": 50
  },
  "clientProfile": {
    "companyName": "Tech Corp",
    "industry": "Technology"
  }
}
```

### GET /api/users/freelancers
**Description:** Get freelancers with filtering  
**Authentication:** Required (Bearer Token)  
**Query Parameters:** skills, experience, minRate, maxRate, availability, page, limit

#### Response (Success - 200)
```json
{
  "freelancers": [
    {
      "id": "freelancer_id",
      "firstName": "John",
      "lastName": "Doe",
      "profilePicture": "https://example.com/picture.jpg",
      "freelancerProfile": {
        "title": "Full Stack Developer",
        "skills": ["JavaScript", "React"],
        "hourlyRate": 50,
        "experience": "intermediate"
      },
      "stats": {
        "avgRating": 4.8,
        "projectsCompleted": 25
      }
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

## Profile Creation/Update Endpoints

### General Profile Update
**Endpoint:** PUT /api/users/profile  
**Description:** Update basic user profile information  
**Authentication:** Required (Bearer Token)

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

#### Request Body
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "profilePicture": "https://example.com/picture.jpg",
  "location": {
    "country": "USA",
    "city": "New York",
    "timezone": "America/New_York"
  },
  "languages": [
    {
      "language": "English",
      "proficiency": "native"
    },
    {
      "language": "Spanish",
      "proficiency": "conversational"
    }
  ]
}
```

#### Response (Success - 200)
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "user_id_here",
    "firstName": "John",
    "lastName": "Doe",
    "profilePicture": "https://example.com/picture.jpg"
  }
}
```

## Freelancer Profile Creation/Update

### PUT /api/users/freelancer-profile
**Description:** Create or update freelancer-specific profile  
**Authentication:** Required (Bearer Token)  
**Note:** User must have 'freelancer' role

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

#### Request Body
```json
{
  "title": "Full Stack Developer",
  "bio": "Experienced developer with 5+ years in web development",
  "skills": ["JavaScript", "TypeScript", "React", "Node.js", "MongoDB"],
  "experience": "intermediate",
  "education": [
    {
      "degree": "Bachelor of Computer Science",
      "institution": "University of Tech",
      "year": 2020
    }
  ],
  "certifications": [
    {
      "name": "AWS Certified Developer",
      "issuer": "Amazon Web Services",
      "date": "2023-06-15T00:00:00.000Z",
      "url": "https://aws.amazon.com/certification"
    }
  ],
  "portfolio": [
    {
      "title": "E-commerce Platform",
      "description": "Built a full-stack e-commerce solution",
      "images": ["https://example.com/project1.jpg"],
      "url": "https://github.com/user/project1",
      "tags": ["React", "Node.js", "MongoDB"]
    }
  ],
  "hourlyRate": 50,
  "availability": "full-time",
  "workingHours": {
    "timezone": "America/New_York",
    "hours": [
      {
        "day": "Monday",
        "start": "09:00",
        "end": "17:00"
      },
      {
        "day": "Tuesday",
        "start": "09:00",
        "end": "17:00"
      }
    ]
  }
}
```

#### Response (Success - 200)
```json
{
  "message": "Freelancer profile updated successfully"
}
```

#### Response (Forbidden - 403)
```json
{
  "statusCode": 403,
  "message": "Forbidden - user is not a freelancer",
  "error": "Forbidden"
}
```

## Client Profile Creation/Update

### PUT /api/users/client-profile
**Description:** Create or update client-specific profile  
**Authentication:** Required (Bearer Token)  
**Note:** User must have 'client' role

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

#### Request Body
```json
{
  "companyName": "Tech Startup Inc.",
  "companySize": "11-50",
  "industry": "Technology",
  "website": "https://techstartup.com",
  "description": "A fast-growing tech company focused on innovative solutions",
  "verified": false
}
```

#### Response (Success - 200)
```json
{
  "message": "Client profile updated successfully"
}
```

#### Response (Forbidden - 403)
```json
{
  "statusCode": 403,
  "message": "Forbidden - user is not a client",
  "error": "Forbidden"
}
```

## Complete Profile Creation Flow

### For Freelancer:
1. **Register:** POST /api/auth/register with role: "freelancer"
2. **Update General Profile:** PUT /api/users/profile with basic info
3. **Update Freelancer Profile:** PUT /api/users/freelancer-profile with professional details

### For Client:
1. **Register:** POST /api/auth/register with role: "client"
2. **Update General Profile:** PUT /api/users/profile with basic info
3. **Update Client Profile:** PUT /api/users/client-profile with company details

## Practical Example - Complete Flow

### 1. Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maduwanthaaselagra@gmail.com",
    "password": "Dilshan@123",
    "role": "freelancer"
  }'
```
**Response:** `{"message": "Registration successful. Please verify your email with the OTP sent."}`

### 2. Verify OTP (if required)
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maduwanthaaselagra@gmail.com",
    "otp": "123456"
  }'
```
**Response contains:** `message`, `access_token`, `refresh_token`, and `user` data

### 3. Use tokens immediately (no separate login needed)
```bash
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_FROM_STEP_2" \
  -d '{
    "firstName": "Asela",
    "lastName": "Maduwantha",
    "phone": "+94760248263",
    "location": {
      "country": "Sri Lanka",
      "city": "Kandy",
      "timezone": "UTC"
    }
  }'
```

### 3. Update Profile (using JWT token)
```bash
curl -X PUT http://localhost:8000/api/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "firstName": "Asela",
    "lastName": "Maduwantha",
    "phone": "+94760248263",
    "location": {
      "country": "Sri Lanka",
      "city": "Kandy",
      "timezone": "UTC"
    }
  }'
```

## Additional Notes
- All profile update endpoints require JWT authentication
- Users can have multiple roles (freelancer, client, both) but activeRole determines current context
- Profile fields are optional and can be updated incrementally
- Email verification may be required before full profile access
- File uploads (profile pictures, portfolio images) would typically use separate endpoints
- **Important:** Registration does NOT return JWT tokens, but OTP verification now DOES return tokens and user data
- **Important:** The OTP verification endpoint is `/api/auth/verify-otp` (not `verify-email-otp`)
