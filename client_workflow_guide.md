# Client Workflow in Freelance Hub Platform

## Overview
This document outlines the complete step-by-step process of what a client can do within the Freelance Hub platform, starting from registration. This is based on the system's API endpoints and workflow as outlined in the `endpoints_guide.md` and the backend controllers.

## Client Workflow in Order

1. **Register as a Client**
   - **Action:** Create a new account by providing email, password, and specifying the role as "client".
   - **Endpoint:** `POST /api/auth/register`
   - **Request Body Example:**
     ```json
     {
       "email": "client@example.com",
       "password": "SecurePass123!",
       "role": "client"
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
       "email": "client@example.com",
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
       "firstName": "Jane",
       "lastName": "Smith",
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
   - **Purpose:** Builds a basic profile to establish credibility.

4. **Update Client-Specific Profile**
   - **Action:** Add company details like company name, industry, website, and description.
   - **Endpoint:** `PUT /api/users/client-profile`
   - **Headers:** Include `Authorization: Bearer <access_token>`
   - **Request Body Example:**
     ```json
     {
       "companyName": "Tech Startup Inc.",
       "companySize": "11-50",
       "industry": "Technology",
       "website": "https://techstartup.com",
       "description": "A fast-growing tech company focused on innovative solutions"
     }
     ```
   - **Response:** Confirmation of client profile update.
   - **Purpose:** Showcases the company to attract freelancers. This profile appears when freelancers view clients.

5. **Browse Freelancers**
   - **Action:** Search and view available freelancers with filters like skills, experience, or rate.
   - **Endpoint:** `GET /api/users/freelancers`
   - **Query Parameters:** Optional filters (e.g., `?skills=JavaScript,React&minRate=30&maxRate=100`)
   - **Headers:** Include `Authorization: Bearer <access_token>`
   - **Response:** List of freelancers with profiles, skills, rates, and stats.
   - **Purpose:** Find suitable freelancers for projects.

6. **Create a Project**
   - **Action:** Post a new project with details like title, description, budget, and requirements.
   - **Endpoint:** `POST /api/clients/projects`
   - **Headers:** Include `Authorization: Bearer <access_token>`
   - **Request Body Example:**
     ```json
     {
       "title": "Build E-commerce Website",
       "description": "Need a full-stack developer for an online store",
       "category": "technology",
       "subcategory": "",
       "requiredSkills": ["JavaScript", "React", "Node.js"],
       "type": "fixed",
       "budget": {
         "amount": 5000,
         "currency": "USD",
         "type": "fixed"
       },
       "timeline": {
         "deadline": "2025-10-01T00:00:00.000Z",
         "duration": 30,
         "isUrgent": false,
         "isFlexible": true
       },
       "requirements": {
         "experienceLevel": "standard",
         "minimumRating": 4,
         "minimumCompletedProjects": 5,
         "preferredLanguages": ["English"],
         "preferredCountries": []
       },
       "visibility": "public",
       "tags": []
     }
     ```
   - **Response:** Confirmation of project creation with project ID.
   - **Purpose:** Attract proposals from freelancers.

7. **View Own Projects**
   - **Action:** Check the status of posted projects and manage them.
   - **Endpoint:** `GET /api/clients/projects/my-projects`
   - **Headers:** Include `Authorization: Bearer <access_token>`
   - **Response:** List of client's projects with status, proposals count, etc.
   - **Purpose:** Monitor project progress and manage listings.

8. **Review Proposals for a Project**
   - **Action:** View and evaluate proposals submitted by freelancers for a specific project.
   - **Endpoint:** `GET /api/clients/projects/{projectId}/proposals`
   - **Headers:** Include `Authorization: Bearer <access_token>`
   - **Response:** List of proposals with freelancer details, bid amounts, and cover letters.
   - **Purpose:** Assess freelancer suitability and select the best candidate.

9. **Accept a Proposal**
   - **Action:** Choose and accept a proposal, which sets the project to in-progress.
   - **Endpoint:** `POST /api/clients/projects/{projectId}/proposals/{proposalId}/accept`
   - **Headers:** Include `Authorization: Bearer <access_token>`
   - **Response:** Confirmation of acceptance.
   - **Purpose:** Hire the freelancer and start the project officially.

10. **View and Manage Contracts**
    - **Action:** Review contracts with freelancers, including milestones and progress.
    - **Endpoint:** `GET /api/contracts`
    - **Headers:** Include `Authorization: Bearer <access_token>`
    - **Response:** List of contracts with freelancer details, milestones, and status.
    - **Purpose:** Track project execution and deliverables.

11. **Approve or Reject Milestones**
    - **Action:** Review submitted work for milestones and approve payment or request revisions.
    - **Endpoint:** `POST /api/contracts/{contractId}/milestones/{milestoneId}/approve` or `POST /api/contracts/{contractId}/milestones/{milestoneId}/reject`
    - **Headers:** Include `Authorization: Bearer <access_token>`
    - **Request Body Example (for approve, optional):**
      ```json
      {
        "feedback": "Great work!"
      }
      ```
    - **Request Body Example (for reject):**
      ```json
      {
        "feedback": "Needs minor adjustments",
        "revisionRequest": "Please fix the styling issues"
      }
      ```
    - **Response:** Confirmation of approval/rejection.
    - **Purpose:** Control quality and release payments incrementally.

12. **Create and Confirm Payments**
    - **Action:** Set up payments for approved milestones using Stripe integration.
    - **Endpoint:** `POST /api/payments/create-intent` (create intent) then `POST /api/payments/{id}/confirm` (confirm)
    - **Headers:** Include `Authorization: Bearer <access_token>`
    - **Request Body Example (create intent):**
      ```json
      {
        "payeeId": "freelancer-user-id",
        "projectId": "project-id",
        "amount": 100000,
        "currency": "usd",
        "milestoneId": "milestone-id"
      }
      ```
    - **Response:** Payment intent details and confirmation.
    - **Purpose:** Pay freelancers securely for completed work.

13. **Monitor Payments**
    - **Action:** View payment history and statistics.
    - **Endpoint:** `GET /api/payments` or `GET /api/payments/stats`
    - **Headers:** Include `Authorization: Bearer <access_token>`
    - **Response:** Details on payments made, including amounts, status, and associated contracts.
    - **Purpose:** Track expenses and ensure proper payouts.

14. **Leave Reviews for Freelancers**
    - **Action:** Rate and review freelancers after project completion.
    - **Endpoint:** `POST /api/reviews`
    - **Headers:** Include `Authorization: Bearer <access_token>`
    - **Request Body Example:**
      ```json
      {
        "revieweeId": "freelancer-user-id",
        "projectId": "project-id",
        "rating": 5,
        "review": "Excellent work, delivered on time!",
        "reviewType": "freelancer"
      }
      ```
    - **Response:** Confirmation of review submission.
    - **Purpose:** Provide feedback and help other clients find good freelancers.

15. **Respond to Reviews**
    - **Action:** Reply to reviews left by freelancers.
    - **Endpoint:** `POST /api/reviews/{id}/respond`
    - **Headers:** Include `Authorization: Bearer <access_token>`
    - **Request Body Example:**
      ```json
      {
        "response": "Thank you for the feedback!"
      }
      ```
    - **Purpose:** Engage with the community and maintain reputation.

16. **Handle Disputes (If Issues Arise)**
    - **Action:** If there's a disagreement (e.g., over deliverables or quality), initiate or participate in a dispute.
    - **Endpoint:** `POST /api/disputes` (to create) or `GET /api/disputes` (to view)
    - **Headers:** Include `Authorization: Bearer <access_token>`
    - **Request Body Example (for creating):**
      ```json
      {
        "contractId": "contract-id",
        "title": "Quality Issues",
        "description": "Work doesn't meet specifications"
      }
      ```
    - **Additional Actions:** Add messages (`POST /api/disputes/{id}/messages`) or submit evidence (`POST /api/disputes/{id}/evidence`).
    - **Purpose:** Resolve conflicts through the platform's dispute resolution system.

17. **Complete or Cancel Contracts**
    - **Action:** Mark contracts as completed or cancel if necessary.
    - **Endpoint:** `POST /api/contracts/{id}/complete` or `POST /api/contracts/{id}/cancel`
    - **Headers:** Include `Authorization: Bearer <access_token>`
    - **Request Body Example (for cancel):**
      ```json
      {
        "reason": "Project requirements changed"
      }
      ```
    - **Purpose:** Close out projects successfully or handle terminations.

18. **Upload Files (e.g., Project Assets, Evidence)**
    - **Action:** Upload files related to projects or disputes using the storage module (if implemented).
    - **Endpoint:** `POST /api/storage/upload/single` or `POST /api/storage/upload/multiple`
    - **Purpose:** Share project files or evidence securely.

## Additional Ongoing Actions
- **Refresh Tokens:** If the access token expires (default 15 minutes), use `POST /api/auth/refresh` with the refresh token to get new ones.
- **Login (If Needed):** If tokens are lost or expired without refresh, use `POST /api/auth/login` with email and password.
- **View Freelancer Reviews:** Check reviews for freelancers before hiring using `GET /api/reviews/user/{userId}`.
- **Follow/Unfollow Users:** Build a network using `POST /api/users/{id}/follow` or `DELETE /api/users/{id}/follow`.
- **File Management:** Use storage endpoints for uploading/downloading files related to projects or profiles.

## Notes
- This process ensures clients can post projects, hire freelancers, manage work, make payments, and maintain their reputation on the platform.
- The system emphasizes security with JWT authentication and integrates with services like Stripe for payments and email for OTP verification.
- All endpoints require proper authentication headers.
- Base URL: `http://localhost:3000/api` (default port, can be changed with PORT environment variable).
