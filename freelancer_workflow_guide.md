# Freelancer Workflow in Freelance Hub Platform

## Overview
This document outlines the complete step-by-step process of what a freelancer can do within the Freelance Hub platform, starting from registration. This is based on the system's API endpoints and workflow as outlined in the `endpoints_guide.md` and the backend controllers.

## Freelancer Workflow in Order

1. **Register as a Freelancer**
   - **Action:** Create a new account by providing email, password, and specifying the role as "freelancer".
   - **Endpoint:** `POST /api/auth/register`
   - **Request Body Example:**
     ```json
     {
       "email": "freelancer@example.com",
       "password": "SecurePass123!",
       "role": "freelancer"
     }
     ```
   - **Response:** Receives a success message (no tokens yet). Registration does not immediately provide access tokens.
   - **Purpose:** Initiates the account creation process. Email verification is required next.

2. **Verify Email with OTP**
   - **Action:** Confirm the email address using a one-time password (OTP) sent to the registered email.
   - **Endpoint:** `POST /api/auth/verify-otp`
   - **Request Body Example:**
     ```json
     {
       "email": "freelancer@example.com",
       "otp": "123456"
     }
     ```
   - **Response:** Returns access and refresh tokens, along with user data (including user ID, email, and role). Tokens are used for all subsequent authenticated requests.
   - **Purpose:** Completes email verification and grants initial access to the platform. No separate login is needed after this step.

3. **Update General Profile Information**
   - **Action:** Add or update basic personal details like name, phone, location, and languages.
   - **Endpoint:** `PUT /api/users/profile`
   - **Headers:** Include `Authorization: Bearer <access_token>`
   - **Request Body Example:**
     ```json
     {
       "firstName": "John",
       "lastName": "Doe",
       "phone": "+1234567890",
       "location": {
         "country": "USA",
         "city": "New York",
         "timezone": "America/New_York"
       },
       "languages": [
         { "language": "English", "proficiency": "native" }
       ]
     }
     ```
   - **Response:** Confirmation of profile update.
   - **Purpose:** Builds a basic profile to make the freelancer more attractive to clients.

4. **Update Freelancer-Specific Profile**
   - **Action:** Add professional details like title, bio, skills, experience, portfolio, and hourly rate.
   - **Endpoint:** `PUT /api/users/freelancer-profile`
   - **Headers:** Include `Authorization: Bearer <access_token>`
   - **Request Body Example:**
     ```json
     {
       "title": "Full Stack Developer",
       "bio": "Experienced developer with 5+ years in web development",
       "skills": ["JavaScript", "React", "Node.js"],
       "experience": "intermediate",
       "hourlyRate": 50,
       "portfolio": [
         {
           "title": "E-commerce Site",
           "description": "Built a full-stack solution",
           "url": "https://github.com/user/project"
         }
       ]
     }
     ```
   - **Response:** Confirmation of freelancer profile update.
   - **Purpose:** Showcases expertise to potential clients. This profile appears when clients search for freelancers.

5. **Browse Other Freelancers**
   - **Action:** Search and view other freelancers for networking, collaboration, or reference.
   - **Endpoint:** `GET /api/users/freelancers`
   - **Query Parameters:** Optional filters (e.g., `?skills=JavaScript,React&experience=intermediate&page=1&limit=10`)
   - **Headers:** Include `Authorization: Bearer <access_token>`
   - **Response:** List of freelancers with profiles, skills, rates, and stats.
   - **Purpose:** Network with peers, find collaborators, or get inspired by others' profiles.

6. **Browse Available Projects**
   - **Action:** Search and view open projects posted by clients, with filters like category, budget, or skills.
   - **Endpoint:** `GET /api/projects`
   - **Query Parameters:** Optional filters (e.g., `?category=web-development&minBudget=1000`)
   - **Headers:** Include `Authorization: Bearer <access_token>`
   - **Response:** List of projects with details like title, description, budget, and client info.
   - **Purpose:** Discover opportunities matching the freelancer's skills and preferences.

7. **Submit a Proposal for a Project**
   - **Action:** Apply to a specific project by submitting a proposal with bid amount, timeline, and cover letter.
   - **Endpoint:** `POST /api/projects/{projectId}/proposals`
   - **Headers:** Include `Authorization: Bearer <access_token>`
   - **Request Body Example:**
     ```json
     {
       "bidAmount": 1500,
       "timeline": "2 weeks",
       "coverLetter": "I can deliver high-quality work..."
     }
     ```
   - **Response:** Confirmation of proposal submission.
   - **Purpose:** Express interest in a project and compete with other freelancers.

8. **View and Manage Own Proposals**
   - **Action:** Check the status of submitted proposals (e.g., pending, accepted, rejected). Can update or withdraw proposals before acceptance.
   - **Endpoint:** `GET /api/projects/my-proposals` (or `GET /api/proposals` for user's proposals)
   - **Additional Management Endpoints:** `PUT /api/proposals/{id}` (update proposal), `DELETE /api/proposals/{id}` (withdraw proposal)
   - **Headers:** Include `Authorization: Bearer <access_token>`
   - **Response:** List of the freelancer's proposals with project details and status.
   - **Purpose:** Track application progress and make adjustments if needed.

9. **View Assigned Projects (If Proposal Accepted)**
   - **Action:** See projects where the freelancer's proposal was accepted and work has begun.
   - **Endpoint:** `GET /api/projects/assigned`
   - **Headers:** Include `Authorization: Bearer <access_token>`
   - **Response:** List of active projects assigned to the freelancer.
   - **Purpose:** Access ongoing work and monitor project status.

10. **View and Manage Contracts**
    - **Action:** Review contracts associated with accepted proposals, including milestones and deadlines.
    - **Endpoint:** `GET /api/contracts`
    - **Headers:** Include `Authorization: Bearer <access_token>`
    - **Response:** List of contracts with details like budget, milestones, and status.
    - **Purpose:** Understand project scope and deliverables.

11. **Submit Work for Milestones**
    - **Action:** Upload completed work or deliverables for a specific milestone in a contract.
    - **Endpoint:** `POST /api/contracts/{contractId}/milestones/{milestoneId}/submit`
    - **Headers:** Include `Authorization: Bearer <access_token>`
    - **Request Body Example:**
      ```json
      {
        "description": "Completed the initial design phase",
        "files": ["link-to-uploaded-file"]
      }
      ```
    - **Response:** Confirmation of submission.
    - **Purpose:** Deliver work on time and request payment approval from the client.

12. **Monitor Payments and Earnings**
    - **Action:** View payment history, pending amounts, and statistics for received funds.
    - **Endpoint:** `GET /api/payments` or `GET /api/payments/stats`
    - **Headers:** Include `Authorization: Bearer <access_token>`
    - **Response:** Details on payments received, including amounts, status, and associated contracts.
    - **Purpose:** Track earnings and ensure timely payouts (handled via Stripe integration).

13. **Leave a Review for the Client**
    - **Action:** Rate and review the client after project completion to build reputation.
    - **Endpoint:** `POST /api/reviews`
    - **Headers:** Include `Authorization: Bearer <access_token>`
    - **Request Body Example:**
      ```json
      {
        "revieweeId": "client-user-id",
        "contractId": "contract-id",
        "rating": 5,
        "comment": "Great client, clear communication!"
      }
      ```
    - **Response:** Confirmation of review submission.
    - **Purpose:** Provide feedback and improve visibility on the platform.

14. **View Own Reviews and Statistics**
    - **Action:** Check reviews received from clients and overall rating stats.
    - **Endpoint:** `GET /api/reviews/user/{userId}/stats`
    - **Headers:** Include `Authorization: Bearer <access_token>`
    - **Response:** Average rating, total reviews, and distribution.
    - **Purpose:** Monitor reputation and respond to reviews if needed.

15. **Handle Disputes (If Issues Arise)**
    - **Action:** If there's a disagreement (e.g., over payment or deliverables), initiate or participate in a dispute.
    - **Endpoint:** `POST /api/disputes` (to create) or `GET /api/disputes` (to view)
    - **Headers:** Include `Authorization: Bearer <access_token>`
    - **Request Body Example (for creating):**
      ```json
      {
        "contractId": "contract-id",
        "title": "Payment Delay",
        "description": "Client hasn't paid for completed work"
      }
      ```
    - **Additional Actions:** Add messages (`POST /api/disputes/{id}/messages`) or submit evidence (`POST /api/disputes/{id}/evidence`).
    - **Purpose:** Resolve conflicts through the platform's dispute resolution system.

16. **Upload Files (e.g., Portfolio, Deliverables)**
    - **Action:** Upload profile pictures, portfolio items, or project files using the storage module (if implemented).
    - **Endpoint:** Likely `POST /api/storage/upload` or similar (based on the storage module structure).
    - **Purpose:** Enhance profile or submit work securely.

## Additional Ongoing Actions
- **Refresh Tokens:** If the access token expires (default 15 minutes), use `POST /api/auth/refresh` with the refresh token to get new ones.
- **Login (If Needed):** If tokens are lost or expired without refresh, use `POST /api/auth/login` with email and password.
- **Complete Contracts:** Mark contracts as done using `POST /api/contracts/{id}/complete` once all milestones are approved.
- **Cancel Contracts:** If necessary, cancel via `POST /api/contracts/{id}/cancel`.
- **File Management:** Use storage endpoints for uploading/downloading files related to projects or profiles.

## Notes
- This process ensures freelancers can onboard, find work, deliver projects, get paid, and maintain their reputation on the platform.
- The system emphasizes security with JWT authentication and integrates with services like Stripe for payments and email for OTP verification.
- All endpoints require proper authentication headers.
- Base URL: `http://localhost:8000/api` (assuming default port).
