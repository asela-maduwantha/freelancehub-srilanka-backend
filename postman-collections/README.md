# FreelanceHub Backend - Postman Collections

This directory contains Postman collections for testing the FreelanceHub backend API endpoints, organized by modules.

## 📁 Collection Structure

Each collection is organized by module and contains:
- **Health Check** - Service availability tests
- **Authentication** - Login, registration, token management
- **Core Business Logic** - Module-specific endpoints
- **Admin Operations** - Administrative functions (if applicable)

## 🚀 Getting Started

### Prerequisites
- [Postman](https://www.postman.com/downloads/) installed
- FreelanceHub backend running locally or on a server

### Import Collections
1. Open Postman
2. Click "Import" button
3. Select "File" tab
4. Choose the `.postman_collection.json` file you want to import
5. Click "Import"

### Environment Setup
1. Create a new environment in Postman
2. Add the following variables:
   - `base_url`: Your API base URL (default: `http://localhost:8000/api`)
   - `access_token`: Will be auto-populated after login
   - `refresh_token`: Will be auto-populated after login

## 📋 Available Collections

### ✅ FreelanceHub-Auth-Module.postman_collection.json
**Status**: Complete

**Endpoints Covered:**
- Health Check
- User Registration (check email, register, verify email)
- Authentication (login, refresh token, profile, logout)
- Password Management (forgot/reset/change password)
- OTP Management (resend OTP, resend verification)

**Key Features:**
- Automatic token storage after login
- Pre-configured request bodies with example data
- Proper authentication headers for protected endpoints

### ✅ FreelanceHub-Jobs-Module.postman_collection.json
**Status**: Complete

**Endpoints Covered:**
- **Public Job Browsing**: Get all jobs, featured jobs, recent jobs, jobs by category, job details
- **Client Job Management**: Create/update/delete jobs, close/reopen jobs, job statistics, view proposals
- **Freelancer Job Actions**: Save/unsave jobs, view saved jobs
- **Reporting & Moderation**: Report inappropriate jobs

**Key Features:**
- Automatic job ID storage after creation
- Comprehensive filtering and pagination examples
- Separate sections for different user roles (client/freelancer)
- Realistic job posting data with budget, skills, and requirements

### ✅ FreelanceHub-Proposals-Module.postman_collection.json
**Status**: Complete

**Endpoints Covered:**
- **Freelancer Proposal Actions**: Create/update/delete proposals, view own proposals
- **Client Proposal Management**: View job proposals, accept/reject proposals
- **Proposal Examples**: Multiple realistic proposal examples with different structures

**Key Features:**
- Complete proposal structures with all optional fields (milestones, attachments, duration)
- Automatic proposal ID storage after creation
- Role-based organization (freelancer vs client actions)
- Multiple example proposals (fixed-price, hourly, complex with milestones)
- Realistic cover letters and milestone breakdowns

### ✅ FreelanceHub-Contracts-Module.postman_collection.json
**Status**: Complete

**Endpoints Covered:**
- **Contract Creation**: Create contracts from accepted proposals (with/without terms)
- **Contract Lifecycle**: Start, sign, complete, and cancel contracts
- **Contract Retrieval**: Get contracts with extensive filtering and search
- **Contract Documents**: Download contracts as PDF
- **Contract Examples**: Hourly contracts, long-term contracts, advanced search

**Key Features:**
- Complete contract creation with optional terms and conditions
- Role-based actions (client vs freelancer permissions)
- Extensive filtering options (status, dates, amounts, search terms)
- Automatic contract ID storage after creation
- Multiple contract types (fixed-price, hourly, long-term)
- Comprehensive search and pagination examples

### ✅ FreelanceHub-Milestones-Module.postman_collection.json
**Status**: Complete

**Endpoints Covered:**
- **Milestone Management**: Create, update, delete milestones (client only)
- **Milestone Workflow**: Mark in-progress, submit, approve, reject, process payment
- **Milestone Retrieval**: Get milestones with advanced filtering and search
- **Contract Milestones**: Get milestones by contract with statistics
- **Milestone Organization**: Reorder milestones within contracts
- **Milestone Examples**: Complex deliverables, multiple submission types

**Key Features:**
- Complete milestone lifecycle management with role-based permissions
- Comprehensive submission process with deliverables and notes
- Advanced filtering by status, contract, overdue status, and search terms
- Automatic milestone ID storage after creation
- Multiple deliverable types and complex milestone structures
- Contract-level milestone statistics and organization

## 🔄 Testing Flow

### For New User Registration:
1. **Check Email** → Verify email is available
2. **Register** → Create new account
3. **Send Verification** → Request OTP
4. **Verify Email** → Complete registration with OTP

### For Existing User Login:
1. **Login** → Authenticate and get tokens (auto-saved)
2. **Get Profile** → Verify authentication works
3. **Use other endpoints** → Tokens are automatically included

### For Password Reset:
1. **Forgot Password** → Request reset OTP
2. **Reset Password** → Use OTP to set new password

## 🔧 Collection Variables

| Variable | Description | Auto-populated |
|----------|-------------|----------------|
| `base_url` | API base URL | No (set manually) |
| `access_token` | JWT access token | Yes (after login) |
| `refresh_token` | JWT refresh token | Yes (after login) |

## 📝 Request Examples

### Authentication Headers
For protected endpoints, the collection automatically includes:
```
Authorization: Bearer {{access_token}}
```

### Request Body Format
All POST requests use JSON format:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

## 🐛 Troubleshooting

### Common Issues:
1. **401 Unauthorized**: Check if access token is valid or refresh it
2. **400 Bad Request**: Verify request body format and required fields
3. **429 Too Many Requests**: Wait for rate limit to reset
4. **500 Internal Server Error**: Check backend logs

### Token Management:
- Access tokens expire (check JWT config)
- Use "Refresh Token" request to get new tokens
- Tokens are automatically saved to collection variables

## 📚 API Documentation

For detailed API documentation, visit the Swagger UI at:
```
http://localhost:8000/api/docs
```

## 🤝 Contributing

When adding new collections:
1. Follow the existing naming convention: `FreelanceHub-{Module}-Module.postman_collection.json`
2. Include proper descriptions for each request
3. Add test scripts for automatic token handling
4. Update this README with new collection details

## 📞 Support

If you encounter issues with the collections or API endpoints, check:
1. Backend server logs
2. API documentation
3. Collection request descriptions
4. Environment variable configuration