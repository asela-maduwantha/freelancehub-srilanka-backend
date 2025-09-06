# Push Notification System

This document describes the push notification system implemented in FreelanceHub.

## Features

- **Real-time Push Notifications**: Send push notifications via Firebase Cloud Messaging (FCM)
- **Email Notifications**: Send email notifications as fallback
- **Notification Types**: Support for message, proposal, payment, milestone, and review notifications
- **User Preferences**: Allow users to customize their notification preferences
- **Priority Levels**: Support for low, medium, high, and urgent priority notifications
- **Read Status Tracking**: Track which notifications have been read
- **Related Entities**: Link notifications to specific entities (messages, proposals, payments, etc.)

## Setup

### Firebase Configuration

Add the following environment variables to your `.env` file:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account-email
```

### Firebase Service Account

1. Go to the Firebase Console
2. Select your project
3. Go to Project Settings > Service Accounts
4. Generate a new private key
5. Download the JSON file
6. Extract the values and add them to your environment variables

## API Endpoints

### Notifications

- `GET /notifications` - Get user's notifications
- `PUT /notifications/:id/read` - Mark notification as read
- `PUT /notifications/read-all` - Mark all notifications as read
- `DELETE /notifications/:id` - Delete notification
- `GET /notifications/unread-count` - Get unread notification count

### User Preferences

- `PUT /notifications/fcm-token` - Update FCM token for push notifications
- `PUT /notifications/preferences` - Update notification preferences
- `GET /notifications/preferences` - Get notification preferences

## Usage Examples

### Update FCM Token (Mobile App)

```javascript
// When user logs in or FCM token changes
const response = await fetch('/notifications/fcm-token', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    fcmToken: 'your-fcm-token-here'
  })
});
```

### Update Notification Preferences

```javascript
const response = await fetch('/notifications/preferences', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    emailNotifications: true,
    pushNotifications: true,
    messageNotifications: true,
    proposalNotifications: false,
    paymentNotifications: true
  })
});
```

### Get Notifications

```javascript
const response = await fetch('/notifications?page=1&limit=20&isRead=false', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

const data = await response.json();
// data.notifications contains the notifications array
// data.total contains total count
// data.unreadCount contains unread count
```

## Integration Points

The notification system is automatically integrated with:

1. **Messaging**: Notifications sent when new messages are received
2. **Proposals**: Notifications sent when new proposals are submitted
3. **Payments**: Notifications sent when payments are released

## Notification Types

- `message`: New message received
- `proposal`: New proposal submitted
- `payment`: Payment released
- `milestone`: Milestone completed
- `review`: New review received

## Priority Levels

- `low`: General notifications
- `medium`: Important updates
- `high`: Time-sensitive information
- `urgent`: Requires immediate attention

## Mobile App Integration

For mobile apps, you'll need to:

1. Set up Firebase SDK in your mobile app
2. Request notification permissions
3. Handle incoming notifications
4. Update FCM token when it changes
5. Handle notification taps to navigate to relevant screens

## Email Templates

Email notifications use the existing email service with custom templates for different notification types.
