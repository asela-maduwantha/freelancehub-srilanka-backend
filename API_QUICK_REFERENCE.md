# Messaging API Quick Reference

## 🔗 Endpoints Summary

### Base URL
```
http://localhost:8000/api/messages
```

### WebSocket URL
```
ws://localhost:8000/messages
```

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/messages` | Create message (start conversation) |
| `GET` | `/messages/conversations` | List all conversations |
| `GET` | `/messages/conversations/:id` | Get conversation details |
| `GET` | `/messages/conversations/:id/messages` | Get messages (paginated) |
| `POST` | `/messages/conversations/:id/messages` | Send message |
| `PATCH` | `/messages/conversations/:id/read` | Mark as read |

---

## 🔐 Authentication

**Header:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**WebSocket:**
```javascript
auth: { token: 'YOUR_JWT_TOKEN' }
```

---

## 📨 Request/Response Examples

### Create Message
```bash
POST /api/messages
{
  "contractId": "contract_id",
  "content": "Hello!"
}

# Response
{
  "success": true,
  "data": {
    "id": "msg_id",
    "conversationId": "conv_id",
    "content": "Hello!",
    "senderId": "user_id",
    "sentAt": "2025-10-04T10:00:00Z"
  }
}
```

### Get Conversations
```bash
GET /api/messages/conversations?page=1&limit=20

# Response
{
  "success": true,
  "data": {
    "conversations": [...],
    "total": 10,
    "page": 1,
    "totalPages": 1
  }
}
```

### Get Messages
```bash
GET /api/messages/conversations/{id}/messages?page=1&limit=50

# Response
{
  "success": true,
  "data": {
    "messages": [...],
    "hasMore": false
  }
}
```

---

## 🔌 WebSocket Events

### Emit (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `join_conversation` | `{ conversationId }` | Join conversation room |
| `leave_conversation` | `{ conversationId }` | Leave conversation room |
| `send_message` | `{ conversationId, content }` | Send message |
| `create_message` | `{ contractId, content }` | Create message |
| `typing` | `{ conversationId, isTyping }` | Typing indicator |
| `mark_as_read` | `{ conversationId }` | Mark as read |

### Listen (Server → Client)

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ userId, socketId }` | Connection success |
| `new_message` | `MessageObject` | New message received |
| `message_notification` | `{ conversationId, message }` | Message notification |
| `user_typing` | `{ conversationId, userId, isTyping }` | User typing |
| `messages_read` | `{ conversationId, userId }` | Messages read |

---

## 💻 Code Snippets

### Connect to WebSocket
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8000/messages', {
  auth: { token: jwtToken }
});

socket.on('connected', (data) => {
  console.log('Connected:', data);
});
```

### Send Message
```javascript
// Via WebSocket
socket.emit('send_message', {
  conversationId: 'conv_id',
  content: 'Hello!'
}, (response) => {
  console.log('Sent:', response);
});

// Via REST API
fetch('http://localhost:8000/api/messages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contractId: 'contract_id',
    content: 'Hello!'
  })
});
```

### Listen for Messages
```javascript
socket.on('new_message', (message) => {
  console.log('New message:', message);
  // Update UI with new message
});
```

### Typing Indicator
```javascript
// Start typing
socket.emit('typing', {
  conversationId: 'conv_id',
  isTyping: true
});

// Stop typing
socket.emit('typing', {
  conversationId: 'conv_id',
  isTyping: false
});

// Listen for typing
socket.on('user_typing', (data) => {
  if (data.isTyping) {
    showTypingIndicator();
  } else {
    hideTypingIndicator();
  }
});
```

---

## 📊 Data Models

### Message Object
```typescript
{
  id: string;
  conversationId: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  senderId: string;
  receiverId: string;
  content: string;
  messageType: 'text' | 'file' | 'system';
  attachments: Array<{
    filename: string;
    url: string;
    size: number;
    type: string;
  }>;
  isRead: boolean;
  isEdited: boolean;
  sentAt: string;
  readAt?: string;
  editedAt?: string;
}
```

### Conversation Object
```typescript
{
  id: string;
  contractId: string;
  milestoneId?: string;
  client: UserParticipant;
  freelancer: UserParticipant;
  lastMessage?: {
    content: string;
    sentAt: string;
  };
  unreadCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## ⚠️ Error Codes

| Code | Meaning |
|------|---------|
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Invalid/expired token |
| `403` | Forbidden - Not authorized for this conversation |
| `404` | Not Found - Conversation/contract not found |
| `500` | Server Error |

---

## 🎯 Query Parameters

### Conversations
```
?page=1              // Page number (default: 1)
&limit=20            // Items per page (default: 20)
&contractId=xxx      // Filter by contract
&includeArchived=false  // Include archived (default: false)
```

### Messages
```
?page=1              // Page number (default: 1)
&limit=50            // Items per page (default: 50)
&before=msg_id       // Get messages before this ID
```

---

## 🚀 Quick Start

1. **Get JWT Token** from login/auth endpoint
2. **Create Message** to start conversation
3. **Connect WebSocket** for real-time updates
4. **Join Conversation** room
5. **Listen** for `new_message` events
6. **Send Messages** via WebSocket or REST

---

## 🔧 Environment Variables

```env
JWT_SECRET=your_secret_key
JWT_EXPIRATION=7d
CORS_ORIGINS=http://localhost:3000
```

---

## 📱 Mobile/Web Usage

### Web (React/Next.js)
```typescript
useEffect(() => {
  const socket = io(WS_URL, { auth: { token } });
  socket.on('new_message', handleNewMessage);
  return () => socket.close();
}, []);
```

### Mobile (React Native)
```typescript
import io from 'socket.io-client';
const socket = io(WS_URL, { 
  auth: { token },
  transports: ['websocket']
});
```

---

## 📝 Notes

- Messages are **automatically** tied to contracts
- Conversations are **created automatically** on first message
- **Unread counts** update automatically
- **Typing indicators** timeout after 3 seconds
- Messages support **pagination** for performance
- WebSocket **auto-reconnects** on disconnect

---

## 🔗 Resources

- **Full Documentation**: `FRONTEND_INTEGRATION_GUIDE.md`
- **Postman Collection**: `postman-collections/FreelanceHub-Messaging-System.postman_collection.json`
- **Detailed Guide**: `MESSAGING_SYSTEM_GUIDE.md`

---

**Last Updated**: October 2025  
**Backend**: http://localhost:8000  
**WebSocket**: ws://localhost:8000/messages
