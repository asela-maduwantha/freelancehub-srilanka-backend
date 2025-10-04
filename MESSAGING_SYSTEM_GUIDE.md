# Real-Time Messaging System Documentation

## Overview

This real-time messaging system enables **clients** and **freelancers** to communicate within the context of specific **contracts** and **milestones**. Built using WebSocket (Socket.IO) for real-time communication and REST APIs for message history and management.

---

## Architecture

### Key Components

1. **Conversation Schema** - Manages chat sessions between users
2. **Message Schema** - Stores individual messages
3. **MessagesService** - Business logic for messaging operations
4. **MessagesGateway** - WebSocket gateway for real-time communication
5. **MessagesController** - REST API endpoints

### Database Schemas

#### Conversation Schema
- Links clients and freelancers within a contract context
- Optionally tied to specific milestones
- Tracks unread message counts per participant
- Maintains last message metadata

#### Message Schema
- Stores message content and metadata
- Supports text messages and file attachments
- Tracks read status and timestamps
- References sender and receiver

---

## Features

### ✅ Core Features
- ✅ One-on-one messaging between client and freelancer
- ✅ Contract-based conversations
- ✅ Milestone-specific conversations
- ✅ Real-time message delivery via WebSocket
- ✅ Message history with pagination
- ✅ Read/unread status tracking
- ✅ Typing indicators
- ✅ File attachments support
- ✅ User authentication and authorization
- ✅ Conversation rooms (join/leave)

### 🔒 Security
- JWT-based authentication for WebSocket connections
- User authorization checks for all operations
- Participants can only access their own conversations

---

## API Endpoints

### REST API

#### 1. Create Message (Start New Conversation)
```http
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "contractId": "contract_id",
  "milestoneId": "milestone_id",  // Optional
  "content": "Hello! How are you?",
  "messageType": "text",           // Optional: "text" | "file" | "system"
  "attachments": []                // Optional: Array of attachments
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message created successfully",
  "data": {
    "id": "message_id",
    "conversationId": "conversation_id",
    "sender": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "url"
    },
    "content": "Hello! How are you?",
    "sentAt": "2025-10-04T10:30:00Z",
    "isRead": false
  }
}
```

#### 2. Get All Conversations
```http
GET /api/messages/conversations?page=1&limit=20&contractId=xxx&includeArchived=false
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Conversations retrieved successfully",
  "data": {
    "conversations": [
      {
        "id": "conversation_id",
        "contractId": "contract_id",
        "milestoneId": "milestone_id",
        "client": { ... },
        "freelancer": { ... },
        "lastMessage": {
          "content": "Last message here",
          "sentAt": "2025-10-04T10:30:00Z"
        },
        "unreadCount": 3,
        "isActive": true
      }
    ],
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

#### 3. Get Conversation Details
```http
GET /api/messages/conversations/:conversationId
Authorization: Bearer <token>
```

#### 4. Get Messages in Conversation
```http
GET /api/messages/conversations/:conversationId/messages?page=1&limit=50&before=message_id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Messages retrieved successfully",
  "data": {
    "messages": [
      {
        "id": "message_id",
        "conversationId": "conversation_id",
        "sender": { ... },
        "content": "Message content",
        "sentAt": "2025-10-04T10:30:00Z",
        "isRead": true,
        "attachments": []
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 50,
    "hasMore": false
  }
}
```

#### 5. Mark Messages as Read
```http
PATCH /api/messages/conversations/:conversationId/read
Authorization: Bearer <token>
```

#### 6. Send Message in Existing Conversation
```http
POST /api/messages/conversations/:conversationId/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "New message here",
  "messageType": "text",
  "attachments": []
}
```

---

## WebSocket Events

### Connection

**Endpoint:** `ws://localhost:8000/messages`

**Authentication:**
```javascript
const socket = io('http://localhost:8000/messages', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events to Listen

#### 1. `connected`
Emitted when successfully connected to the server.
```javascript
socket.on('connected', (data) => {
  console.log('Connected:', data);
  // { userId: 'user_id', socketId: 'socket_id' }
});
```

#### 2. `new_message`
Emitted when a new message is sent in a conversation you're part of.
```javascript
socket.on('new_message', (message) => {
  console.log('New message:', message);
  // Display message in UI
});
```

#### 3. `message_notification`
Emitted to notify you of a new message (even if you're not in the conversation room).
```javascript
socket.on('message_notification', (data) => {
  console.log('New message notification:', data);
  // { conversationId: 'xxx', message: { ... } }
  // Update conversation list, show notification badge
});
```

#### 4. `user_typing`
Emitted when another user is typing in a conversation.
```javascript
socket.on('user_typing', (data) => {
  console.log('User typing:', data);
  // { conversationId: 'xxx', userId: 'user_id', isTyping: true }
  // Show "User is typing..." indicator
});
```

#### 5. `messages_read`
Emitted when someone reads messages in a conversation.
```javascript
socket.on('messages_read', (data) => {
  console.log('Messages read:', data);
  // { conversationId: 'xxx', userId: 'user_id' }
  // Update message read status in UI
});
```

### Events to Emit

#### 1. `join_conversation`
Join a conversation room to receive real-time updates.
```javascript
socket.emit('join_conversation', {
  conversationId: 'conversation_id'
}, (response) => {
  console.log('Joined conversation:', response);
});
```

#### 2. `leave_conversation`
Leave a conversation room.
```javascript
socket.emit('leave_conversation', {
  conversationId: 'conversation_id'
}, (response) => {
  console.log('Left conversation:', response);
});
```

#### 3. `send_message`
Send a message in an existing conversation.
```javascript
socket.emit('send_message', {
  conversationId: 'conversation_id',
  content: 'Hello!',
  messageType: 'text',
  attachments: []
}, (response) => {
  if (response.success) {
    console.log('Message sent:', response.message);
  }
});
```

#### 4. `create_message`
Create a new message (starts conversation if needed).
```javascript
socket.emit('create_message', {
  contractId: 'contract_id',
  milestoneId: 'milestone_id', // Optional
  content: 'Hello!',
  messageType: 'text',
  attachments: []
}, (response) => {
  if (response.success) {
    console.log('Message created:', response.message);
  }
});
```

#### 5. `typing`
Indicate that you're typing.
```javascript
// Start typing
socket.emit('typing', {
  conversationId: 'conversation_id',
  isTyping: true
});

// Stop typing
socket.emit('typing', {
  conversationId: 'conversation_id',
  isTyping: false
});
```

#### 6. `mark_as_read`
Mark all messages in a conversation as read.
```javascript
socket.emit('mark_as_read', {
  conversationId: 'conversation_id'
}, (response) => {
  console.log('Marked as read:', response);
});
```

---

## Frontend Integration Example

### React/Next.js Example

```typescript
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useMessaging(token: string, conversationId?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:8000/messages', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to messaging server');
    });

    newSocket.on('connected', (data) => {
      console.log('Authentication successful:', data);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from messaging server');
    });

    newSocket.on('new_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('user_typing', (data) => {
      if (data.conversationId === conversationId) {
        setIsTyping(data.isTyping);
      }
    });

    newSocket.on('messages_read', (data) => {
      // Update message read status
      console.log('Messages read:', data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  useEffect(() => {
    if (socket && conversationId) {
      // Join conversation room
      socket.emit('join_conversation', { conversationId }, (response) => {
        console.log('Joined conversation:', response);
      });

      return () => {
        // Leave conversation room on unmount
        socket.emit('leave_conversation', { conversationId });
      };
    }
  }, [socket, conversationId]);

  const sendMessage = (content: string, attachments = []) => {
    if (socket && conversationId) {
      socket.emit('send_message', {
        conversationId,
        content,
        messageType: 'text',
        attachments
      }, (response) => {
        if (response.success) {
          console.log('Message sent successfully');
        } else {
          console.error('Error sending message:', response.error);
        }
      });
    }
  };

  const indicateTyping = (isTyping: boolean) => {
    if (socket && conversationId) {
      socket.emit('typing', { conversationId, isTyping });
    }
  };

  const markAsRead = () => {
    if (socket && conversationId) {
      socket.emit('mark_as_read', { conversationId });
    }
  };

  return {
    socket,
    messages,
    isConnected,
    isTyping,
    sendMessage,
    indicateTyping,
    markAsRead
  };
}
```

### Usage in Component

```typescript
function ChatComponent({ contractId, token }) {
  const [conversationId, setConversationId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const { 
    messages, 
    isConnected, 
    isTyping, 
    sendMessage, 
    indicateTyping,
    markAsRead 
  } = useMessaging(token, conversationId);

  useEffect(() => {
    // Fetch conversation for contract
    fetchConversation(contractId).then(conv => {
      setConversationId(conv.id);
    });
  }, [contractId]);

  useEffect(() => {
    // Mark messages as read when viewing conversation
    if (conversationId) {
      markAsRead();
    }
  }, [conversationId, messages]);

  const handleSend = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue('');
      indicateTyping(false);
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    indicateTyping(e.target.value.length > 0);
  };

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id}>{msg.content}</div>
        ))}
        {isTyping && <div>User is typing...</div>}
      </div>

      <input 
        value={inputValue}
        onChange={handleInputChange}
        onBlur={() => indicateTyping(false)}
        placeholder="Type a message..."
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

---

## Testing

### Test WebSocket with HTML Client

A simple HTML test client is available at `socket-test.html` in the project root. Update the token and open it in a browser to test WebSocket connections.

### Manual Testing Steps

1. **Start the server:**
   ```bash
   npm run start:dev
   ```

2. **Test REST API:**
   - Use Postman or curl to test REST endpoints
   - Ensure you have valid JWT token

3. **Test WebSocket:**
   - Open `socket-test.html` in browser
   - Connect with valid JWT token
   - Send messages and observe real-time updates

---

## Data Flow

### Sending a Message Flow

1. User sends message via WebSocket (`send_message` event)
2. Gateway authenticates user and validates access
3. Service creates message in database
4. Service updates conversation metadata
5. Gateway emits `new_message` to conversation room
6. Gateway emits `message_notification` to receiver's personal room
7. All connected clients in room receive the message

### Reading Messages Flow

1. User marks conversation as read
2. Service updates all unread messages for that user
3. Service resets unread count in conversation
4. Gateway notifies other participants via `messages_read` event

---

## Best Practices

### Frontend
- Reconnect on disconnect with exponential backoff
- Buffer messages when offline and retry on reconnect
- Show connection status to users
- Implement optimistic UI updates
- Clear typing indicator after timeout

### Backend
- Messages are indexed for fast queries
- Use pagination for message history
- Implement rate limiting on WebSocket events
- Monitor socket connections and memory usage

---

## Environment Variables

Ensure these are set in your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=7d

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# WebSocket Configuration (if needed)
WS_PORT=8000
```

---

## Future Enhancements

- [ ] Message editing and deletion
- [ ] Message reactions (emoji)
- [ ] File upload integration
- [ ] Voice messages
- [ ] Group conversations (for disputes/mediation)
- [ ] Message search functionality
- [ ] Push notifications for offline users
- [ ] Message encryption
- [ ] Video call integration

---

## Troubleshooting

### Connection Issues
- Verify JWT token is valid and not expired
- Check CORS settings match your frontend URL
- Ensure WebSocket port is accessible

### Messages Not Appearing
- Verify user has joined the conversation room
- Check that user is authorized for the conversation
- Inspect browser console for errors

### High Memory Usage
- Monitor active socket connections
- Implement connection limits per user
- Add socket timeout configurations

---

## Support

For issues or questions:
1. Check the logs in `logs/combined.log`
2. Verify database connections
3. Test with the provided HTML test client
4. Review error messages in browser console

---

**Built with:** NestJS, Socket.IO, MongoDB, TypeScript
**Last Updated:** October 2025
