# Job Status Quick Reference Card

## 📊 Status Definitions

| Status | Code | Description | User Can See | Typical Duration |
|--------|------|-------------|--------------|------------------|
| **DRAFT** | `draft` | Job created but not published | Client only | Hours to days |
| **OPEN** | `open` | Published, accepting proposals | Everyone | Days to weeks |
| **AWAITING_CONTRACT** | `awaiting-contract` | Proposal accepted, contract pending | Client & Freelancer | Hours to days |
| **CONTRACTED** | `contracted` | Contract created and active | Client & Freelancer | Days to months |
| **IN_PROGRESS** | `in-progress` | Legacy status (deprecated) | Client & Freelancer | Use CONTRACTED |
| **UNDER_REVIEW** | `under-review` | Work submitted for approval | Client & Freelancer | Hours to days |
| **COMPLETED** | `completed` | Successfully finished with payment | Everyone | Final state |
| **CLOSED** | `closed` | Manually closed without completion | Client & Freelancer | Final state |
| **CANCELLED** | `cancelled` | Cancelled by either party | Client & Freelancer | Final state |

---

## 🔄 Status Transitions

### Normal Flow
```
DRAFT → OPEN → AWAITING_CONTRACT → CONTRACTED → UNDER_REVIEW → COMPLETED
```

### Alternative Paths
```
OPEN → CLOSED (client closes without selecting)
AWAITING_CONTRACT → CANCELLED (client changes mind)
CONTRACTED → CANCELLED (either party cancels)
CLOSED → OPEN (reopen job)
COMPLETED → OPEN (reopen job)
```

---

## 🚫 Invalid Transitions

❌ Cannot go from `DRAFT` to `COMPLETED`  
❌ Cannot go from `CLOSED` to `CONTRACTED`  
❌ Cannot go from `COMPLETED` to `AWAITING_CONTRACT`  
❌ Cannot create contract for `CLOSED` job  
❌ Cannot accept proposal on `CLOSED` job  

---

## 🎯 When Status Changes

| Action | Status Before | Status After | Triggered By |
|--------|---------------|--------------|--------------|
| Publish job | DRAFT | OPEN | Client |
| Accept proposal | OPEN | AWAITING_CONTRACT | Client |
| Create contract | AWAITING_CONTRACT | CONTRACTED | Client |
| Submit work | CONTRACTED | UNDER_REVIEW | Freelancer* |
| Approve & pay | UNDER_REVIEW | COMPLETED | Client* |
| Close job | OPEN | CLOSED | Client |
| Cancel job | Any | CANCELLED | Either |
| Reopen job | CLOSED/COMPLETED | OPEN | Client |

*Not yet implemented in current version

---

## 💡 Business Rules

### One Job = One Contract ✅
- A job can have only ONE contract
- Enforced at application and database level
- Attempting to create second contract throws error

### Contract Prerequisites
- Job must be in `AWAITING_CONTRACT` or `IN_PROGRESS` status
- Job must have an accepted proposal
- Job must NOT already have a contract

### Proposal Acceptance
- Job must be `OPEN`
- Only one proposal can be accepted
- All other proposals automatically rejected
- Job status changes to `AWAITING_CONTRACT`

---

## 🔍 Status Queries

### Find jobs by status (MongoDB)
```javascript
// All open jobs
db.jobs.find({ status: "open" })

// Jobs waiting for contracts
db.jobs.find({ status: "awaiting-contract" })

// Active contracts
db.jobs.find({ status: "contracted" })

// All completed work
db.jobs.find({ status: "completed" })
```

### Find jobs with issues
```javascript
// Jobs with status mismatch
db.jobs.find({ 
  status: "contracted", 
  contractId: null 
})

// Jobs with multiple contracts (should be 0)
db.contracts.aggregate([
  { $group: { _id: "$jobId", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

---

## 📱 Frontend Display

### Status Badges
- **DRAFT**: Gray badge "Draft"
- **OPEN**: Green badge "Open for Proposals"
- **AWAITING_CONTRACT**: Orange badge "Contract Pending"
- **CONTRACTED**: Blue badge "In Progress"
- **UNDER_REVIEW**: Purple badge "Under Review"
- **COMPLETED**: Green badge "Completed"
- **CLOSED**: Gray badge "Closed"
- **CANCELLED**: Red badge "Cancelled"

### User Actions by Status
| Status | Client Can | Freelancer Can |
|--------|-----------|----------------|
| DRAFT | Edit, Publish, Delete | - |
| OPEN | Close, Edit, View Proposals | Submit Proposal |
| AWAITING_CONTRACT | Create Contract, Cancel | View, Cancel |
| CONTRACTED | View Progress, Complete | Submit Work |
| UNDER_REVIEW | Approve, Request Changes | View |
| COMPLETED | Leave Review | Leave Review |
| CLOSED | Reopen, Delete | View |

---

## 🐛 Troubleshooting

### Job stuck in AWAITING_CONTRACT
**Cause**: Client accepted proposal but didn't create contract  
**Fix**: Client needs to create contract, or cancel job

### Job shows CONTRACTED but no contract exists
**Cause**: Data corruption or migration issue  
**Fix**: Set status to AWAITING_CONTRACT or recreate contract

### Cannot create contract
**Check**: 
1. Is job status AWAITING_CONTRACT or IN_PROGRESS?
2. Does job already have a contractId?
3. Is proposal status "accepted"?

---

**Last Updated**: October 1, 2025
