# FreelanceHub Messaging System - Frontend Integration Guide

## 🎯 Overview

This document provides complete specifications for integrating the real-time messaging system into your FreelanceHub frontend application. The system enables clients and freelancers to communicate within contracts and milestones.

---

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Authentication](#authentication)
3. [REST API Endpoints](#rest-api-endpoints)
4. [WebSocket Integration](#websocket-integration)
5. [Data Models](#data-models)
6. [Implementation Examples](#implementation-examples)
7. [UI/UX Components](#uiux-components)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)

---

## 🏗 System Architecture

### Backend Details
- **Base URL**: `http://localhost:8000/api` (Development)
- **WebSocket URL**: `http://localhost:8000/messages`
- **Authentication**: JWT Bearer Token
- **Protocol**: REST API + Socket.IO WebSocket

### Communication Flow
```
Frontend ←→ REST API (HTTP/HTTPS)
    ↓
Frontend ←→ WebSocket (Socket.IO)
    ↓
Real-time Messages
```

---

## 🔐 Authentication

### JWT Token
All requests require a JWT token in the Authorization header.

**REST API:**
```javascript
headers: {
  'Authorization': `Bearer ${jwtToken}`,
  'Content-Type': 'application/json'
}
```

**WebSocket:**
```javascript
const socket = io('http://localhost:8000/messages', {
  auth: {
    token: jwtToken  // No 'Bearer' prefix
  }
});
```

### Token Payload Structure
```typescript
{
  sub: string;        // User ID
  userId: string;     // User ID (alternative)
  email: string;
  role: 'client' | 'freelancer';
  iat: number;
  exp: number;
}
```

---

## 📡 REST API Endpoints

### Base URL
```
http://localhost:8000/api/messages
```

---

### 1. Create Message (Start Conversation)

**Endpoint:** `POST /messages`

**Description:** Creates a new message and automatically creates/finds a conversation for the contract.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```typescript
{
  contractId: string;           // Required: The contract ID
  milestoneId?: string;         // Optional: Specific milestone
  content: string;              // Required: Message content (max 5000 chars)
  messageType?: 'text' | 'file' | 'system';  // Optional: Default 'text'
  attachments?: Array<{
    filename: string;
    url: string;
    size: number;
    type: string;               // MIME type
  }>;
}
```

**Success Response (201):**
```typescript
{
  success: true,
  message: "Message created successfully",
  data: {
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
    messageType: string;
    attachments: Array<{
      filename: string;
      url: string;
      size: number;
      type: string;
    }>;
    isRead: boolean;
    isEdited: boolean;
    sentAt: string;              // ISO 8601 date
    readAt?: string;
    editedAt?: string;
  },
  timestamp: string;
  statusCode: 201;
}
```

**Error Responses:**
- `400` - Invalid input (missing required fields, content too long)
- `403` - Not authorized (user not part of the contract)
- `404` - Contract or milestone not found
- `401` - Unauthorized (invalid/expired token)

**Example (JavaScript/TypeScript):**
```typescript
async function createMessage(contractId: string, content: string, milestoneId?: string) {
  const response = await fetch('http://localhost:8000/api/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contractId,
      milestoneId,
      content,
      messageType: 'text'
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}
```

---

### 2. Get All Conversations

**Endpoint:** `GET /messages/conversations`

**Description:** Retrieves all conversations for the authenticated user with pagination.

**Query Parameters:**
```typescript
{
  page?: number;              // Default: 1
  limit?: number;             // Default: 20
  contractId?: string;        // Filter by specific contract
  includeArchived?: boolean;  // Default: false
}
```

**Example URL:**
```
GET /messages/conversations?page=1&limit=20&contractId=abc123
```

**Success Response (200):**
```typescript
{
  success: true,
  message: "Conversations retrieved successfully",
  data: {
    conversations: Array<{
      id: string;
      contractId: string;
      milestoneId?: string;
      client: {
        id: string;
        firstName: string;
        lastName: string;
        avatar?: string;
        role: 'client';
      };
      freelancer: {
        id: string;
        firstName: string;
        lastName: string;
        avatar?: string;
        role: 'freelancer';
      };
      lastMessage?: {
        id: string;
        content: string;
        senderId: string;
        messageType: string;
        sentAt: string;
        isRead: boolean;
      };
      lastMessageAt?: string;
      unreadCount: number;       // Unread count for current user
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  },
  timestamp: string;
  statusCode: 200;
}
```

**Example:**
```typescript
async function getConversations(page = 1, limit = 20, contractId?: string) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(contractId && { contractId })
  });
  
  const response = await fetch(
    `http://localhost:8000/api/messages/conversations?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return await response.json();
}
```

---

### 3. Get Conversation Details

**Endpoint:** `GET /messages/conversations/:conversationId`

**Description:** Get detailed information about a specific conversation.

**URL Parameters:**
- `conversationId` (string, required) - The conversation ID

**Success Response (200):**
```typescript
{
  success: true,
  message: "Conversation retrieved successfully",
  data: {
    id: string;
    contractId: string;
    milestoneId?: string;
    client: { /* User object */ };
    freelancer: { /* User object */ };
    lastMessage?: { /* Message object */ };
    lastMessageAt?: string;
    unreadCount: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  },
  timestamp: string;
  statusCode: 200;
}
```

**Error Responses:**
- `404` - Conversation not found
- `403` - Not authorized to access this conversation

**Example:**
```typescript
async function getConversation(conversationId: string) {
  const response = await fetch(
    `http://localhost:8000/api/messages/conversations/${conversationId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return await response.json();
}
```

---

### 4. Get Messages in Conversation

**Endpoint:** `GET /messages/conversations/:conversationId/messages`

**Description:** Retrieve paginated messages for a conversation (sorted newest first).

**URL Parameters:**
- `conversationId` (string, required) - The conversation ID

**Query Parameters:**
```typescript
{
  page?: number;      // Default: 1
  limit?: number;     // Default: 50 (max recommended: 100)
  before?: string;    // Message ID - get messages before this ID
}
```

**Example URL:**
```
GET /messages/conversations/abc123/messages?page=1&limit=50
```

**Success Response (200):**
```typescript
{
  success: true,
  message: "Messages retrieved successfully",
  data: {
    messages: Array<{
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
      messageType: string;
      attachments?: Array<{
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
    }>;
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;           // True if more messages available
  },
  timestamp: string;
  statusCode: 200;
}
```

**Example with Infinite Scroll:**
```typescript
async function getMessages(
  conversationId: string, 
  page = 1, 
  limit = 50
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  
  const response = await fetch(
    `http://localhost:8000/api/messages/conversations/${conversationId}/messages?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return await response.json();
}

// For infinite scroll - load older messages
async function loadOlderMessages(
  conversationId: string,
  oldestMessageId: string
) {
  const params = new URLSearchParams({
    before: oldestMessageId,
    limit: '50'
  });
  
  const response = await fetch(
    `http://localhost:8000/api/messages/conversations/${conversationId}/messages?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return await response.json();
}
```

---

### 5. Send Message in Existing Conversation

**Endpoint:** `POST /messages/conversations/:conversationId/messages`

**Description:** Send a message in an existing conversation.

**URL Parameters:**
- `conversationId` (string, required) - The conversation ID

**Request Body:**
```typescript
{
  content: string;              // Required: max 5000 chars
  messageType?: 'text' | 'file';
  attachments?: Array<{
    filename: string;
    url: string;
    size: number;
    type: string;
  }>;
}
```

**Success Response (201):**
```typescript
{
  success: true,
  message: "Message sent successfully",
  data: {
    // Message object (same as Create Message)
  },
  timestamp: string;
  statusCode: 201;
}
```

**Example:**
```typescript
async function sendMessage(conversationId: string, content: string) {
  const response = await fetch(
    `http://localhost:8000/api/messages/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content,
        messageType: 'text'
      })
    }
  );
  
  return await response.json();
}
```

---

### 6. Mark Messages as Read

**Endpoint:** `PATCH /messages/conversations/:conversationId/read`

**Description:** Mark all unread messages in a conversation as read.

**URL Parameters:**
- `conversationId` (string, required) - The conversation ID

**Request Body:** None

**Success Response (200):**
```typescript
{
  success: true,
  message: "Messages marked as read successfully",
  data: null,
  timestamp: string;
  statusCode: 200;
}
```

**Example:**
```typescript
async function markMessagesAsRead(conversationId: string) {
  const response = await fetch(
    `http://localhost:8000/api/messages/conversations/${conversationId}/read`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return await response.json();
}
```

---

## 🔌 WebSocket Integration

### Connection Setup

**WebSocket URL:** `http://localhost:8000/messages`

**Install Socket.IO Client:**
```bash
npm install socket.io-client
# or
yarn add socket.io-client
```

**Basic Connection:**
```typescript
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:8000/messages', {
  auth: {
    token: jwtToken  // Your JWT token (no 'Bearer' prefix)
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// Connection events
socket.on('connect', () => {
  console.log('WebSocket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('WebSocket disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

---

### WebSocket Events Reference

#### Events to EMIT (Client → Server)

##### 1. `join_conversation`
Join a conversation room to receive real-time updates.

**Emit:**
```typescript
socket.emit('join_conversation', 
  { conversationId: string },
  (response) => {
    console.log('Join response:', response);
    // { success: boolean, conversationId: string }
  }
);
```

**When to use:**
- When user opens a conversation/chat window
- On conversation page mount

---

##### 2. `leave_conversation`
Leave a conversation room.

**Emit:**
```typescript
socket.emit('leave_conversation',
  { conversationId: string },
  (response) => {
    console.log('Leave response:', response);
    // { success: boolean, conversationId: string }
  }
);
```

**When to use:**
- When user closes conversation/chat window
- On conversation page unmount
- When switching to another conversation

---

##### 3. `send_message`
Send a message in an existing conversation (real-time).

**Emit:**
```typescript
socket.emit('send_message',
  {
    conversationId: string;
    content: string;
    messageType?: 'text' | 'file';
    attachments?: Array<{
      filename: string;
      url: string;
      size: number;
      type: string;
    }>;
  },
  (response) => {
    if (response.success) {
      console.log('Message sent:', response.message);
    } else {
      console.error('Error:', response.error);
    }
  }
);
```

**Response:**
```typescript
{
  success: boolean;
  message?: MessageObject;  // If successful
  error?: string;           // If failed
}
```

---

##### 4. `create_message`
Create a new message with contract context (starts conversation if needed).

**Emit:**
```typescript
socket.emit('create_message',
  {
    contractId: string;
    milestoneId?: string;
    content: string;
    messageType?: 'text' | 'file';
    attachments?: Array<AttachmentObject>;
  },
  (response) => {
    if (response.success) {
      console.log('Message created:', response.message);
    }
  }
);
```

---

##### 5. `typing`
Indicate typing status to other participants.

**Emit:**
```typescript
// Start typing
socket.emit('typing', {
  conversationId: string;
  isTyping: true;
});

// Stop typing
socket.emit('typing', {
  conversationId: string;
  isTyping: false;
});
```

**Best Practice:**
- Emit `isTyping: true` when user starts typing
- Emit `isTyping: false` after 3 seconds of no typing
- Emit `isTyping: false` when message is sent
- Emit `isTyping: false` on input blur

---

##### 6. `mark_as_read`
Mark all messages in a conversation as read.

**Emit:**
```typescript
socket.emit('mark_as_read',
  { conversationId: string },
  (response) => {
    console.log('Marked as read:', response.success);
  }
);
```

**When to use:**
- When user opens/views a conversation
- When conversation is in viewport
- Periodically while conversation is open

---

#### Events to LISTEN (Server → Client)

##### 1. `connected`
Emitted when WebSocket connection is established and authenticated.

**Listen:**
```typescript
socket.on('connected', (data: { userId: string; socketId: string }) => {
  console.log('Authenticated as user:', data.userId);
  console.log('Socket ID:', data.socketId);
});
```

---

##### 2. `new_message`
Emitted when a new message is sent in a conversation you're in.

**Listen:**
```typescript
socket.on('new_message', (message: MessageObject) => {
  console.log('New message received:', message);
  
  // Add message to conversation
  setMessages(prev => [...prev, message]);
  
  // Update conversation list
  updateConversationLastMessage(message.conversationId, message);
});
```

**Message Object Structure:**
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
  messageType: string;
  attachments: Array<AttachmentObject>;
  isRead: boolean;
  isEdited: boolean;
  sentAt: string;
}
```

---

##### 3. `message_notification`
Emitted when you receive a message (even if not in the conversation room).

**Listen:**
```typescript
socket.on('message_notification', (data: {
  conversationId: string;
  message: MessageObject;
}) => {
  console.log('Message notification:', data);
  
  // Show notification badge
  incrementUnreadCount(data.conversationId);
  
  // Show toast/notification
  showNotification({
    title: `${data.message.sender.firstName}`,
    body: data.message.content
  });
});
```

**Use Case:**
- Update conversation list unread badges
- Show push notifications
- Play notification sound

---

##### 4. `user_typing`
Emitted when another user is typing in a conversation.

**Listen:**
```typescript
socket.on('user_typing', (data: {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}) => {
  if (data.conversationId === currentConversationId) {
    setIsOtherUserTyping(data.isTyping);
    
    if (data.isTyping) {
      showTypingIndicator();
    } else {
      hideTypingIndicator();
    }
  }
});
```

---

##### 5. `messages_read`
Emitted when someone reads messages in a conversation.

**Listen:**
```typescript
socket.on('messages_read', (data: {
  conversationId: string;
  userId: string;
}) => {
  console.log(`User ${data.userId} read messages in ${data.conversationId}`);
  
  // Update message read status in UI
  if (data.conversationId === currentConversationId) {
    markAllMessagesAsRead();
  }
});
```

---

## 📊 Data Models (TypeScript Interfaces)

```typescript
// User Participant
interface UserParticipant {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role?: 'client' | 'freelancer';
}

// Message Attachment
interface MessageAttachment {
  filename: string;
  url: string;
  size: number;
  type: string;  // MIME type
}

// Message
interface Message {
  id: string;
  conversationId: string;
  sender: UserParticipant;
  senderId: string;
  receiverId: string;
  content: string;
  messageType: 'text' | 'file' | 'system';
  attachments: MessageAttachment[];
  isRead: boolean;
  isEdited: boolean;
  sentAt: string;  // ISO 8601
  readAt?: string;
  editedAt?: string;
}

// Conversation
interface Conversation {
  id: string;
  contractId: string;
  milestoneId?: string;
  client: UserParticipant;
  freelancer: UserParticipant;
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    messageType: string;
    sentAt: string;
    isRead: boolean;
  };
  lastMessageAt?: string;
  unreadCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Response
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  statusCode: number;
}

// Paginated Response
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  hasMore?: boolean;
}
```

---

## 💻 Implementation Examples

### Complete React Hook

```typescript
// hooks/useMessaging.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Message, Conversation } from '../types/messaging';

interface UseMessagingOptions {
  token: string;
  conversationId?: string;
  onNewMessage?: (message: Message) => void;
  onTyping?: (isTyping: boolean) => void;
}

export function useMessaging({
  token,
  conversationId,
  onNewMessage,
  onTyping
}: UseMessagingOptions) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:8000/messages', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ WebSocket connected');
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('❌ WebSocket disconnected:', reason);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
    });

    newSocket.on('connected', (data) => {
      console.log('Authenticated:', data);
    });

    // Message events
    newSocket.on('new_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      onNewMessage?.(message);
    });

    newSocket.on('message_notification', (data) => {
      console.log('Message notification:', data);
      // Handle notification
    });

    newSocket.on('user_typing', (data) => {
      if (data.conversationId === conversationId) {
        setIsOtherUserTyping(data.isTyping);
        onTyping?.(data.isTyping);
      }
    });

    newSocket.on('messages_read', (data) => {
      if (data.conversationId === conversationId) {
        // Update messages as read
        setMessages(prev =>
          prev.map(msg => ({ ...msg, isRead: true }))
        );
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  // Join/leave conversation
  useEffect(() => {
    if (socket && conversationId) {
      socket.emit('join_conversation', { conversationId }, (response) => {
        console.log('Joined conversation:', response);
      });

      return () => {
        socket.emit('leave_conversation', { conversationId });
      };
    }
  }, [socket, conversationId]);

  // Send message
  const sendMessage = useCallback((content: string, attachments = []) => {
    if (!socket || !conversationId) return;

    socket.emit('send_message', {
      conversationId,
      content,
      messageType: 'text',
      attachments
    }, (response) => {
      if (response.success) {
        console.log('Message sent');
      } else {
        console.error('Failed to send:', response.error);
      }
    });
  }, [socket, conversationId]);

  // Typing indicator
  const indicateTyping = useCallback((isTyping: boolean) => {
    if (!socket || !conversationId) return;

    socket.emit('typing', { conversationId, isTyping });

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { conversationId, isTyping: false });
      }, 3000);
    }
  }, [socket, conversationId]);

  // Mark as read
  const markAsRead = useCallback(() => {
    if (!socket || !conversationId) return;

    socket.emit('mark_as_read', { conversationId });
  }, [socket, conversationId]);

  return {
    socket,
    isConnected,
    messages,
    isOtherUserTyping,
    sendMessage,
    indicateTyping,
    markAsRead
  };
}
```

---

### Chat Component Example

```typescript
// components/ChatWindow.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useMessaging } from '../hooks/useMessaging';
import type { Message } from '../types/messaging';

interface ChatWindowProps {
  conversationId: string;
  token: string;
}

export function ChatWindow({ conversationId, token }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isConnected,
    isOtherUserTyping,
    sendMessage,
    indicateTyping,
    markAsRead
  } = useMessaging({
    token,
    conversationId,
    onNewMessage: (message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    }
  });

  // Load initial messages
  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  // Mark as read when viewing
  useEffect(() => {
    if (messages.length > 0) {
      markAsRead();
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/messages/conversations/${conversationId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const result = await response.json();
      if (result.success) {
        setMessages(result.data.messages.reverse()); // Reverse for chronological order
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue('');
      indicateTyping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    indicateTyping(e.target.value.length > 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-window">
      {/* Connection Status */}
      <div className="status-bar">
        {isConnected ? (
          <span className="connected">🟢 Connected</span>
        ) : (
          <span className="disconnected">🔴 Disconnected</span>
        )}
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`message ${message.senderId === userId ? 'sent' : 'received'}`}
          >
            <div className="message-header">
              <span className="sender-name">
                {message.sender.firstName} {message.sender.lastName}
              </span>
              <span className="timestamp">
                {new Date(message.sentAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">{message.content}</div>
            {message.attachments?.length > 0 && (
              <div className="attachments">
                {message.attachments.map((att, idx) => (
                  <a key={idx} href={att.url} target="_blank" rel="noopener">
                    📎 {att.filename}
                  </a>
                ))}
              </div>
            )}
            {message.isRead && (
              <span className="read-indicator">✓✓</span>
            )}
          </div>
        ))}
        
        {isOtherUserTyping && (
          <div className="typing-indicator">
            <span>User is typing</span>
            <span className="dots">...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="input-container">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onBlur={() => indicateTyping(false)}
          placeholder="Type a message..."
          disabled={!isConnected}
        />
        <button onClick={handleSend} disabled={!inputValue.trim() || !isConnected}>
          Send
        </button>
      </div>
    </div>
  );
}
```

---

### Conversation List Component

```typescript
// components/ConversationList.tsx
import React, { useState, useEffect } from 'react';
import type { Conversation } from '../types/messaging';

interface ConversationListProps {
  token: string;
  onSelectConversation: (conversationId: string) => void;
}

export function ConversationList({ token, onSelectConversation }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadConversations();
  }, [page]);

  const loadConversations = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/messages/conversations?page=${page}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const result = await response.json();
      
      if (result.success) {
        setConversations(result.data.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading conversations...</div>;

  return (
    <div className="conversation-list">
      <h2>Messages</h2>
      
      {conversations.length === 0 ? (
        <div className="empty-state">
          <p>No conversations yet</p>
        </div>
      ) : (
        conversations.map((conv) => (
          <div
            key={conv.id}
            className="conversation-item"
            onClick={() => onSelectConversation(conv.id)}
          >
            <div className="avatar">
              <img 
                src={conv.freelancer.avatar || '/default-avatar.png'} 
                alt={conv.freelancer.firstName}
              />
            </div>
            
            <div className="conversation-info">
              <div className="conversation-header">
                <span className="name">
                  {conv.freelancer.firstName} {conv.freelancer.lastName}
                </span>
                {conv.lastMessageAt && (
                  <span className="time">
                    {new Date(conv.lastMessageAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              
              {conv.lastMessage && (
                <div className="last-message">
                  <p>{conv.lastMessage.content}</p>
                </div>
              )}
            </div>
            
            {conv.unreadCount > 0 && (
              <div className="unread-badge">{conv.unreadCount}</div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
```

---

## 🎨 UI/UX Components

### Recommended UI Components

1. **ConversationList**
   - Shows all conversations
   - Displays unread count badges
   - Shows last message preview
   - Sorts by most recent activity

2. **ChatWindow**
   - Message history with infinite scroll
   - Real-time message updates
   - Typing indicators
   - Read receipts
   - File attachment display

3. **MessageBubble**
   - Sender/receiver styling
   - Timestamp
   - Read status
   - Attachment preview

4. **ChatInput**
   - Text input with auto-resize
   - File upload button
   - Send button
   - Typing indicator trigger

5. **TypingIndicator**
   - Animated "..." dots
   - Shows when other user is typing

6. **NotificationBadge**
   - Unread message count
   - Show on conversation list items
   - Show on main navigation

---

## 🚨 Error Handling

### Common Error Scenarios

```typescript
// HTTP Errors
async function handleApiError(response: Response) {
  if (!response.ok) {
    const error = await response.json();
    
    switch (response.status) {
      case 401:
        // Token expired or invalid
        console.error('Unauthorized - redirecting to login');
        redirectToLogin();
        break;
        
      case 403:
        // Not authorized for this conversation
        console.error('Forbidden:', error.message);
        showErrorToast('You do not have access to this conversation');
        break;
        
      case 404:
        // Conversation or contract not found
        console.error('Not found:', error.message);
        showErrorToast('Conversation not found');
        break;
        
      case 400:
        // Validation error
        console.error('Validation error:', error.message);
        showErrorToast(error.message);
        break;
        
      default:
        console.error('Server error:', error.message);
        showErrorToast('Something went wrong. Please try again.');
    }
    
    throw new Error(error.message);
  }
  
  return response.json();
}

// WebSocket Errors
socket.on('connect_error', (error) => {
  console.error('WebSocket connection failed:', error.message);
  
  // Retry logic
  setTimeout(() => {
    socket.connect();
  }, 5000);
});

socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server disconnected - token might be invalid
    console.error('Server disconnected. Check authentication.');
  } else {
    // Network issue - will auto-reconnect
    console.log('Disconnected. Reconnecting...');
  }
});
```

---

## ✅ Best Practices

### 1. Message Sending
```typescript
// Optimistic UI updates
function sendMessageOptimistically(content: string) {
  const tempMessage = {
    id: `temp-${Date.now()}`,
    content,
    senderId: currentUserId,
    sentAt: new Date().toISOString(),
    isRead: false,
    pending: true
  };
  
  // Add to UI immediately
  setMessages(prev => [...prev, tempMessage]);
  
  // Send via WebSocket
  socket.emit('send_message', { conversationId, content }, (response) => {
    if (response.success) {
      // Replace temp message with real message
      setMessages(prev =>
        prev.map(msg => msg.id === tempMessage.id ? response.message : msg)
      );
    } else {
      // Show error, remove temp message
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      showError('Failed to send message');
    }
  });
}
```

### 2. Typing Indicators
```typescript
// Debounce typing indicator
let typingTimeout: NodeJS.Timeout;

function handleTyping(isTyping: boolean) {
  socket.emit('typing', { conversationId, isTyping });
  
  if (isTyping) {
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit('typing', { conversationId, isTyping: false });
    }, 3000);
  }
}
```

### 3. Infinite Scroll
```typescript
// Load older messages on scroll
const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  if (e.currentTarget.scrollTop === 0 && !loading && hasMore) {
    loadOlderMessages();
  }
};

async function loadOlderMessages() {
  const oldestMessage = messages[0];
  const response = await fetch(
    `http://localhost:8000/api/messages/conversations/${conversationId}/messages?before=${oldestMessage.id}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  
  const result = await response.json();
  if (result.success) {
    setMessages(prev => [...result.data.messages.reverse(), ...prev]);
    setHasMore(result.data.hasMore);
  }
}
```

### 4. Connection Management
```typescript
// Reconnection with backoff
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

socket.on('disconnect', () => {
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  
  if (reconnectAttempts < maxReconnectAttempts) {
    setTimeout(() => {
      reconnectAttempts++;
      socket.connect();
    }, delay);
  }
});

socket.on('connect', () => {
  reconnectAttempts = 0;
});
```

### 5. Mark as Read
```typescript
// Mark as read when conversation is visible
useEffect(() => {
  const handleVisibility = () => {
    if (!document.hidden && conversationId) {
      markAsRead();
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibility);
  
  // Mark as read when component mounts
  markAsRead();
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}, [conversationId]);
```

---

## 🧪 Testing Checklist

### Functional Tests
- [ ] Can create a new message
- [ ] Messages appear in real-time
- [ ] Typing indicators work correctly
- [ ] Read receipts update
- [ ] Unread counts are accurate
- [ ] Pagination loads older messages
- [ ] File attachments display correctly
- [ ] Conversation list updates
- [ ] WebSocket reconnects automatically

### Edge Cases
- [ ] Handle offline/online transitions
- [ ] Handle token expiration
- [ ] Handle very long messages
- [ ] Handle rapid message sending
- [ ] Handle simultaneous typing
- [ ] Handle conversation switching
- [ ] Handle empty conversations
- [ ] Handle deleted contracts

### Performance
- [ ] Large message lists render smoothly
- [ ] Infinite scroll performs well
- [ ] WebSocket doesn't leak memory
- [ ] Images/attachments load efficiently

---

## 🌐 Production Considerations

### Environment Variables
```env
# Frontend .env
NEXT_PUBLIC_API_URL=https://api.freelancehub.com
NEXT_PUBLIC_WS_URL=https://api.freelancehub.com/messages
```

### Security
- Always use HTTPS in production
- Validate JWT tokens server-side
- Sanitize message content (XSS prevention)
- Implement rate limiting
- Use secure WebSocket (WSS)

### Performance
- Implement message caching
- Use virtual scrolling for long lists
- Compress large messages
- Optimize image attachments
- Use CDN for static assets

---

## 📞 Support & Debugging

### Debug Mode
```typescript
// Enable Socket.IO debug logs
localStorage.debug = 'socket.io-client:socket';

// Check connection state
console.log('Socket connected:', socket.connected);
console.log('Socket ID:', socket.id);

// Monitor events
socket.onAny((event, ...args) => {
  console.log('Event:', event, args);
});
```

### Common Issues

**Messages not appearing:**
- Verify user joined conversation room
- Check network tab for WebSocket frames
- Verify JWT token is valid

**Connection keeps dropping:**
- Check server logs
- Verify CORS settings
- Check firewall/proxy settings

**High latency:**
- Check network connection
- Verify server resources
- Consider message batching

---

## 📚 Additional Resources

- Socket.IO Client Documentation: https://socket.io/docs/v4/client-api/
- React Hooks Best Practices
- WebSocket Security Guidelines
- Real-time UI/UX Patterns

---

**Document Version:** 1.0  
**Last Updated:** October 2025  
**Backend Version:** NestJS 11.x  
**Frontend Compatibility:** React 18+, Next.js 13+, Vue 3+, Angular 15+

---

## Quick Reference Card

```typescript
// REST API Base
const API_URL = 'http://localhost:8000/api/messages';

// WebSocket
const WS_URL = 'http://localhost:8000/messages';

// Endpoints
POST   /messages                                    // Create message
GET    /messages/conversations                      // List conversations
GET    /messages/conversations/:id                  // Get conversation
GET    /messages/conversations/:id/messages         // Get messages
POST   /messages/conversations/:id/messages         // Send message
PATCH  /messages/conversations/:id/read             // Mark as read

// WebSocket Events (Emit)
join_conversation, leave_conversation
send_message, create_message
typing, mark_as_read

// WebSocket Events (Listen)
connected, new_message, message_notification
user_typing, messages_read
```

---

**Ready to implement!** 🚀
