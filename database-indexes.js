/**
 * Database Indexes for Performance Optimization
 * 
 * Run these commands in MongoDB shell or via MongoDB Compass
 * to optimize query performance for the FreelanceHub application.
 * 
 * IMPORTANT: Run in production with proper planning during maintenance windows
 */

// Users Collection Indexes
db.users.createIndex({ "email": 1 }, { unique: true, background: true });
db.users.createIndex({ "role": 1, "status": 1 }, { background: true });
db.users.createIndex({ "location.country": 1, "role": 1 }, { background: true });
db.users.createIndex({ "freelancerProfile.skills": 1, "status": 1 }, { background: true });
db.users.createIndex({ "stats.avgRating": -1, "role": 1 }, { background: true });
db.users.createIndex({ "freelancerProfile.hourlyRate": 1, "role": 1 }, { background: true });
db.users.createIndex({ "lastLogin": -1 }, { background: true });

// Projects Collection Indexes  
db.projects.createIndex({ "status": 1, "createdAt": -1 }, { background: true });
db.projects.createIndex({ "clientId": 1, "status": 1 }, { background: true });
db.projects.createIndex({ "freelancerId": 1, "status": 1 }, { background: true });
db.projects.createIndex({ "category": 1, "status": 1 }, { background: true });
db.projects.createIndex({ "budget": 1, "status": 1 }, { background: true });
db.projects.createIndex({ "requiredSkills.skill": 1, "status": 1 }, { background: true });
db.projects.createIndex({ "deadline": 1, "status": 1 }, { background: true });
db.projects.createIndex({ "budgetType": 1, "budget": 1, "status": 1 }, { background: true });

// Proposals Collection Indexes
db.proposals.createIndex({ "projectId": 1, "status": 1 }, { background: true });
db.proposals.createIndex({ "freelancerId": 1, "status": 1 }, { background: true });
db.proposals.createIndex({ "projectId": 1, "freelancerId": 1 }, { unique: true, background: true });
db.proposals.createIndex({ "createdAt": -1, "status": 1 }, { background: true });
db.proposals.createIndex({ "proposedBudget": 1, "projectId": 1 }, { background: true });

// Contracts Collection Indexes
db.contracts.createIndex({ "clientId": 1, "status": 1 }, { background: true });
db.contracts.createIndex({ "freelancerId": 1, "status": 1 }, { background: true });
db.contracts.createIndex({ "projectId": 1 }, { background: true });
db.contracts.createIndex({ "status": 1, "createdAt": -1 }, { background: true });
db.contracts.createIndex({ "terms.endDate": 1, "status": 1 }, { background: true });

// Payments Collection Indexes
db.payments.createIndex({ "payerId": 1, "status": 1 }, { background: true });
db.payments.createIndex({ "payeeId": 1, "status": 1 }, { background: true });
db.payments.createIndex({ "projectId": 1, "status": 1 }, { background: true });
db.payments.createIndex({ "status": 1, "createdAt": -1 }, { background: true });
db.payments.createIndex({ "stripePaymentIntentId": 1 }, { background: true });
db.payments.createIndex({ "dueDate": 1, "status": 1 }, { background: true });

// Reviews Collection Indexes
db.reviews.createIndex({ "revieweeId": 1, "status": 1 }, { background: true });
db.reviews.createIndex({ "reviewerId": 1, "createdAt": -1 }, { background: true });
db.reviews.createIndex({ "projectId": 1 }, { background: true });
db.reviews.createIndex({ "rating": -1, "revieweeId": 1 }, { background: true });
db.reviews.createIndex({ "reviewType": 1, "status": 1 }, { background: true });

// Disputes Collection Indexes
db.disputes.createIndex({ "contractId": 1, "status": 1 }, { background: true });
db.disputes.createIndex({ "initiatorId": 1, "status": 1 }, { background: true });
db.disputes.createIndex({ "respondentId": 1, "status": 1 }, { background: true });
db.disputes.createIndex({ "status": 1, "createdAt": -1 }, { background: true });

// Text Search Indexes (for search functionality)
db.projects.createIndex({
  "title": "text",
  "description": "text",
  "category": "text",
  "requiredSkills.skill": "text"
}, {
  weights: {
    "title": 10,
    "description": 5,
    "category": 3,
    "requiredSkills.skill": 7
  },
  background: true
});

db.users.createIndex({
  "firstName": "text",
  "lastName": "text",
  "freelancerProfile.title": "text",
  "freelancerProfile.skills": "text",
  "clientProfile.companyName": "text"
}, {
  weights: {
    "firstName": 5,
    "lastName": 5,
    "freelancerProfile.title": 8,
    "freelancerProfile.skills": 7,
    "clientProfile.companyName": 6
  },
  background: true
});

// Compound indexes for complex queries
db.projects.createIndex({ 
  "status": 1, 
  "category": 1, 
  "budget": 1, 
  "createdAt": -1 
}, { background: true });

db.users.createIndex({ 
  "role": 1, 
  "status": 1, 
  "freelancerProfile.hourlyRate": 1,
  "stats.avgRating": -1 
}, { background: true });

console.log("✅ Database indexes created successfully!");
console.log("🚀 Your application should now have significantly improved query performance.");
