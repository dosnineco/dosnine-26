# Agent Feedback System

A comprehensive feedback system that allows admins to send messages to agents and receive responses.

## Features

### For Agents
- **Floating Feedback Button**: A floating button in the bottom-right corner of the agent dashboard with unread count badge
- **Message Inbox**: View all messages from admin in a clean, organized interface
- **Response System**: Reply directly to admin messages
- **Read Status Tracking**: Messages are marked as read when viewed
- **Real-time Updates**: Automatically checks for new messages every 30 seconds

### For Admins
- **Broadcast Messages**: Send messages to all verified agents at once
- **Message History**: View all sent messages and agent responses
- **Response Tracking**: See which agents have responded and which haven't
- **Agent Details**: View full agent information when reviewing responses
- **Read Status**: Track which messages have been read by agents
- **Unread Response Alerts**: Get notified when agents respond

## Setup Instructions

### 1. Run Database Migration

Execute the SQL migration in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of:
-- db-migrations/012_create_agent_feedback.sql
```

This will create:
- `agent_feedback` table
- Row Level Security policies
- Indexes for performance
- Auto-update triggers

### 2. Database Structure

The `agent_feedback` table includes:
- `id`: UUID primary key
- `agent_id`: Reference to agents table
- `admin_message`: The message from admin
- `agent_response`: The agent's response (nullable)
- `message_read`: Boolean for agent read status
- `response_read`: Boolean for admin read status
- `admin_clerk_id`: The admin who sent the message
- `created_at`: When message was sent
- `responded_at`: When agent responded
- `updated_at`: Last update timestamp

### 3. Usage

#### For Admins (Admin Dashboard)

1. Click the "Agent Feedback" button in the admin dashboard header
2. Choose "Compose Message" tab
3. Type your message and click "Send to All Agents"
4. Switch to "Message History" to view responses
5. Click on any message to see full details and agent response
6. Unread responses show a badge notification

#### For Agents (Agent Dashboard)

1. A floating button appears in the bottom-right corner
2. Badge shows number of unread messages
3. Click to open the feedback popup
4. Read messages and submit responses
5. Previous responses are shown for reference
6. System auto-checks for new messages every 30 seconds

## API Endpoints

### Agent Endpoints (`/api/agent/feedback`)

**GET** - Get all feedback for an agent
- Query params: `clerkId`
- Returns: `{ feedback: [], unreadCount: number }`

**POST** - Submit a response to admin message
- Body: `{ clerkId, feedbackId, response }`
- Returns: `{ success: true, feedback: {} }`

**PUT** - Mark message as read
- Body: `{ clerkId, feedbackId }`
- Returns: `{ success: true }`

### Admin Endpoints (`/api/admin/feedback`)

**GET** - Get all feedback with agent details
- Query params: `clerkId`
- Returns: `{ feedback: [], unreadResponses: number }`

**POST** - Send message to agents
- Body: `{ clerkId, message, agentIds?: [] }`
- If `agentIds` is empty, sends to all verified agents
- Returns: `{ success: true, count: number, feedback: [] }`

**PUT** - Mark agent response as read
- Body: `{ clerkId, feedbackId }`
- Returns: `{ success: true }`

## Components

### `AgentFeedbackPopup.js`
- Floating button with notification badge
- Modal popup with message list and detail views
- Response submission form
- Auto-refresh functionality

### `AdminFeedbackManager.js`
- Button integration in admin dashboard
- Compose message interface
- Message history with response tracking
- Full message and response detail views

## Security

- Row Level Security (RLS) enabled
- Agents can only view/update their own feedback
- Admins have full access to all feedback
- All operations verified against Clerk user ID
- Proper foreign key constraints

## Notifications

- Visual badges for unread counts
- Real-time polling every 30 seconds
- Toast notifications on success/error
- Color-coded status indicators

## Styling

- Consistent with existing design system
- Responsive layout for mobile and desktop
- Smooth animations and transitions
- Accessible color contrasts
- Loading states for async operations
