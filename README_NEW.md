# FreelanceHub Backend - Clean Architecture

A comprehensive NestJS backend application for a freelancing platform with clean database schemas, TypeScript types, DTOs, and modular architecture.

## 🏗️ Architecture Overview

This backend follows a clean, modular architecture with:

- **16 Core Entities** with proper MongoDB schemas
- **Type-safe DTOs** for all API operations
- **Comprehensive TypeScript interfaces** and types
- **Modular structure** with dedicated modules for each domain
- **Clean separation of concerns** with controllers, services, and schemas

## 📁 Project Structure

```
src/
├── schemas/                    # MongoDB Schemas (16 entities)
│   ├── user.schema.ts
│   ├── otp.schema.ts
│   ├── freelancer-profile.schema.ts
│   ├── client-profile.schema.ts
│   ├── project.schema.ts
│   ├── proposal.schema.ts
│   ├── contract.schema.ts
│   ├── payment.schema.ts
│   ├── conversation.schema.ts
│   ├── message.schema.ts
│   ├── review.schema.ts
│   ├── notification.schema.ts
│   ├── category.schema.ts
│   ├── skill.schema.ts
│   ├── dispute.schema.ts
│   ├── saved-project.schema.ts
│   └── index.ts
├── dto/                        # Data Transfer Objects
│   ├── common.dto.ts
│   ├── user.dto.ts
│   ├── freelancer-profile.dto.ts
│   ├── client-profile.dto.ts
│   ├── project.dto.ts
│   ├── proposal.dto.ts
│   ├── contract.dto.ts
│   └── index.ts
├── types/                      # TypeScript Types & Enums
│   └── index.ts
├── interfaces/                 # TypeScript Interfaces
│   ├── entities.interface.ts
│   └── index.ts
├── modules/                    # Feature Modules
│   ├── auth/
│   ├── users/
│   ├── projects/
│   ├── proposals/
│   ├── contracts/
│   ├── payments/
│   ├── disputes/
│   ├── reviews/
│   ├── messaging/
│   ├── storage/
│   ├── admin/
│   ├── clients/
│   ├── freelancers/
│   ├── categories/
│   ├── notifications/
│   └── saved-projects/
├── common/                     # Shared Components
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   ├── services/
│   └── utils/
├── config/                     # Configuration Files
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── azure.config.ts
│   ├── email.config.ts
│   ├── redis.config.ts
│   └── stripe.config.ts
└── main.ts
```

## 🎯 Core Entities

### 1. User Management
- **User**: Core user entity with authentication
- **OTP**: Email verification and password reset
- **FreelancerProfile**: Detailed freelancer information
- **ClientProfile**: Client company information

### 2. Project Workflow
- **Project**: Job postings by clients
- **Proposal**: Freelancer bids on projects
- **Contract**: Accepted proposals become contracts
- **Payment**: Escrow and payment processing

### 3. Communication
- **Conversation**: Chat threads between users
- **Message**: Individual messages with attachments
- **Notification**: System notifications

### 4. Quality & Trust
- **Review**: Mutual feedback system
- **Dispute**: Conflict resolution

### 5. Organization
- **Category**: Project categorization
- **Skill**: Skills taxonomy
- **SavedProject**: Freelancer bookmarks

## 🚀 Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (freelancer/client)
- Email verification with OTP
- Password reset functionality

### Project Management
- Create and manage projects
- Advanced search and filtering
- Project categorization and tagging
- Budget management (fixed/hourly)

### Proposal System
- Submit proposals with milestones
- Proposal status tracking
- Timeline management
- File attachments

### Contract & Payment
- Milestone-based contracts
- Escrow payment system
- PayHere integration
- Payment status tracking

### Communication
- Real-time messaging
- File sharing
- Conversation threading
- Unread message tracking

### Review System
- 5-star rating system
- Multiple rating categories
- Public/private reviews
- Review responses

## 🛠️ Technology Stack

- **Framework**: NestJS (Node.js)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with Passport
- **File Storage**: Azure Blob Storage
- **Payment**: PayHere (Sri Lankan payment gateway)
- **Email**: Nodemailer with custom service
- **Caching**: In-memory cache
- **Documentation**: Swagger/OpenAPI
- **Validation**: class-validator & class-transformer

## 📊 Database Schema Features

### Comprehensive Indexing
All schemas include optimized indexes for:
- Query performance
- Search functionality
- Sorting operations
- Unique constraints

### Data Validation
- Strong type validation
- Enum constraints
- Required field validation
- Custom validation rules

### Relationships
- Proper MongoDB ObjectId references
- Population support for related data
- Cascade operations where appropriate

## 🔧 API Endpoints

### Authentication
```
POST /auth/register          # User registration
POST /auth/login            # User login
POST /auth/verify-email     # Email verification
POST /auth/forgot-password  # Password reset request
POST /auth/reset-password   # Password reset
```

### Users
```
GET    /users/profile       # Get user profile
PUT    /users/profile       # Update user profile
GET    /users/:id          # Get user by ID
```

### Projects
```
GET    /projects           # List projects with filters
POST   /projects           # Create project
GET    /projects/:id       # Get project details
PUT    /projects/:id       # Update project
DELETE /projects/:id       # Delete project
```

### Proposals
```
GET    /proposals          # List proposals
POST   /proposals          # Submit proposal
GET    /proposals/:id      # Get proposal details
PUT    /proposals/:id      # Update proposal
```

### Categories
```
GET    /categories         # List categories
POST   /categories         # Create category
GET    /categories/popular # Get popular categories
PUT    /categories/:id     # Update category
```

## 📈 Performance Optimizations

### Database Indexing
- Strategic compound indexes
- Text search indexes
- Geospatial indexes for location-based queries
- TTL indexes for temporary data (OTP)

### Caching Strategy
- API response caching
- Database query result caching
- Static data caching (categories, skills)

### Query Optimization
- Proper aggregation pipelines
- Efficient population strategies
- Pagination for large datasets
- Selective field projection

## 🔐 Security Features

### Data Protection
- Password hashing with bcrypt
- JWT token security
- Input validation and sanitization
- MongoDB injection prevention

### Rate Limiting
- API endpoint rate limiting
- User-specific rate limits
- Global application limits

### Access Control
- Role-based permissions
- Resource ownership validation
- JWT token validation
- Guard-based protection

## 🧪 Data Validation

### DTO Validation
- Type-safe request/response DTOs
- Comprehensive validation rules
- Swagger documentation integration
- Error message standardization

### Schema Validation
- Mongoose schema validation
- Custom validation functions
- Unique constraint enforcement
- Data type validation

## 📚 API Documentation

The API is fully documented using Swagger/OpenAPI with:
- Detailed endpoint descriptions
- Request/response schemas
- Authentication requirements
- Example payloads
- Error response codes

Access the documentation at: `http://localhost:3000/api/docs`

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB
- Azure Storage Account (for file uploads)
- PayHere Account (for payments)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd freelancehub-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Configuration**
```bash
cp .env.example .env
# Configure your environment variables
```

4. **Start MongoDB**
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or use your local MongoDB installation
mongod
```

5. **Run the application**
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Environment Variables

```env
# Database
DATABASE_URI=mongodb://localhost:27017/freelancehub

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=your-azure-connection-string
AZURE_CONTAINER_NAME=uploads

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password

# PayHere
PAYHERE_MERCHANT_ID=your-merchant-id
PAYHERE_MERCHANT_SECRET=your-merchant-secret
PAYHERE_SANDBOX=true

# Application
PORT=3000
NODE_ENV=development
```

## 🧹 Code Quality

### TypeScript Configuration
- Strict type checking
- Path mapping for clean imports
- Decorator support
- Modern ES features

### Linting & Formatting
```bash
npm run lint          # ESLint
npm run format        # Prettier
npm run test          # Jest tests
npm run test:e2e      # End-to-end tests
```

## 📋 Development Guidelines

### Module Structure
Each module follows this structure:
```
module-name/
├── controllers/       # HTTP request handlers
├── services/         # Business logic
├── dto/             # Data transfer objects
├── schemas/         # If module-specific schemas needed
└── module-name.module.ts
```

### Naming Conventions
- **Files**: kebab-case (user-profile.dto.ts)
- **Classes**: PascalCase (UserProfileDto)
- **Variables/Functions**: camelCase (getUserProfile)
- **Constants**: UPPER_SNAKE_CASE (MAX_FILE_SIZE)

### Error Handling
- Use NestJS built-in exceptions
- Implement global exception filter
- Provide meaningful error messages
- Log errors appropriately

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation at `/api/docs`

---

Built with ❤️ using NestJS and TypeScript
