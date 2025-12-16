# Agent Sign-Up & Service Request Feature Documentation

## Overview

This feature allows regular users to sign up as verified agents and handle service requests from clients looking for property assistance. The system includes:

1. **Agent Sign-Up Form** - Multi-step registration for new agents
2. **User Role Selection** - Let users choose between buyer, landlord, or agent
3. **Service Request System** - Clients can request agent services
4. **Agent Notification Dashboard** - Agents see incoming requests and client details
5. **Database Schema** - Support for users, service requests, and notifications

---

## Feature Components

### 1. **AgentSignup.js** (`components/AgentSignup.js`)
A comprehensive 3-step form for agent registration:

**Step 1: Basic Information**
- Full name, email, phone
- Business name
- Years of experience (0-10+)
- Specializations (Residential, Commercial, Land, Luxury, etc.)
- Real estate license number
- Service areas (parishes/regions)
- About me / bio
- Deals closed count

**Step 2: Document Verification**
- Upload real estate agent license (PDF, JPG, PNG, max 5MB)
- Upload business registration certificate
- Agree to terms and conditions

**Step 3: Review & Submit**
- Review all information before submission
- Final confirmation

**Features:**
- Client-side validation
- File size and type validation
- Progress indicator (step counter)
- Success notification on completion

### 2. **UserRoleSelection.js** (`components/UserRoleSelection.js`)
A beautiful landing component that lets users choose their role:

**Role Options:**
1. **Looking for a Property?** → Links to `/search`
   - Browse listings
   - Filter by price, location, type
   - Save favorites
   - Direct contact

2. **Have a Property to Rent?** → Links to `/landlord/new-property`
   - Create listings
   - Boost visibility
   - Manage inquiries
   - Track performance

3. **Become a Verified Agent** → Links to `/agent/signup`
   - Serve more clients
   - Get service requests
   - Premium visibility
   - Grow business

4. **Premium Service Request** → Links to `/service-request`
   - Work with verified agents
   - Get personalized options
   - 30 days follow-up

### 3. **PremiumServiceRequest.js** (Updated)
Already exists but now integrated with the system:

**Functionality:**
- Users select a verified agent
- Submit detailed property requirements
- Agent gets notified immediately
- Agents can see all client details

### 4. **AgentNotificationCenter.js** (`components/AgentNotificationCenter.js`)
Agent dashboard for managing service requests:

**Features:**
- View all incoming service requests
- Filter: All / Unread requests
- Unread counter
- Expandable request details showing:
  - Client name, email, phone
  - Property type, location
  - Budget range
  - Bedrooms, bathrooms
  - Timeline (Urgent/1-3 months/Flexible)
  - Special requirements
  - Contact buttons (email/call)
  - Mark as read functionality
- Auto-refresh every 30 seconds
- Real-time unread notifications

---

## Database Schema

### `users` Table (Extended)
Additional agent-related columns:
```sql
- user_type: 'owner' | 'agent'
- agent_specialization: TEXT
- agent_business_name: TEXT
- agent_years_experience: INTEGER
- agent_license_number: TEXT
- agent_verification_status: 'pending' | 'approved' | 'rejected'
- agent_verification_submitted_at: TIMESTAMP
- agent_verified: BOOLEAN
```

### `service_requests` Table (New)
```sql
CREATE TABLE service_requests (
  id UUID PRIMARY KEY (auto-generated)
  user_id UUID (Foreign Key → users)
  agent_id UUID (Foreign Key → users)
  property_type TEXT ('residential' | 'commercial' | 'land' | 'mixed')
  location TEXT
  budget_min NUMERIC
  budget_max NUMERIC
  bedrooms INTEGER
  bathrooms INTEGER
  timeline TEXT ('urgent' | '1-3-months' | 'flexible')
  requirements TEXT
  status TEXT ('pending' | 'viewed' | 'matched' | 'completed' | 'rejected')
  created_at TIMESTAMP
  updated_at TIMESTAMP
  viewed_at TIMESTAMP
)
```

### `agent_notifications` Table (New)
```sql
CREATE TABLE agent_notifications (
  id UUID PRIMARY KEY (auto-generated)
  agent_id UUID (Foreign Key → users)
  service_request_id UUID (Foreign Key → service_requests)
  notification_type TEXT ('new_request' | 'request_updated' | 'request_completed')
  is_read BOOLEAN (default: false)
  read_at TIMESTAMP (NULL if not read)
  created_at TIMESTAMP
)
```

---

## API Endpoints

### 1. **Agent Sign-Up**
**POST** `/api/agents/signup`

Request body:
```json
{
  "userId": "uuid",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "businessName": "Doe Properties",
  "yearsExperience": 5,
  "specializations": ["Residential", "Investment Properties"],
  "licenseNumber": "REA12345",
  "serviceAreas": "Kingston, St. Andrew",
  "aboutMe": "10+ years in real estate",
  "dealsClosedCount": 50
}
```

Response:
```json
{
  "success": true,
  "message": "Agent application submitted successfully",
  "agent": { /* updated user object */ }
}
```

### 2. **Get Verified Agents**
**GET** `/api/agents/verified`

Response:
```json
{
  "success": true,
  "agents": [
    {
      "id": "uuid",
      "full_name": "John Doe",
      "agent_specialization": "Residential",
      "agent_years_experience": 5,
      "location": "Kingston",
      "deals_closed": 50
    }
  ]
}
```

### 3. **Submit Service Request**
**POST** `/api/service-requests/premium`

Headers:
```
x-user-id: user_uuid
```

Request body:
```json
{
  "agentId": "uuid",
  "propertyType": "residential",
  "location": "Kingston",
  "budgetMin": 5000000,
  "budgetMax": 15000000,
  "bedrooms": 3,
  "bathrooms": 2,
  "timeline": "1-3-months",
  "requirements": "Near schools and shopping"
}
```

Response:
```json
{
  "success": true,
  "message": "Service request sent to agent",
  "serviceRequest": { /* request object */ }
}
```

### 4. **Get Agent Notifications**
**GET** `/api/agents/notifications/:agentId`

Response:
```json
{
  "success": true,
  "notifications": [
    {
      "id": "uuid",
      "notification_type": "new_request",
      "is_read": false,
      "created_at": "2025-12-15T10:30:00Z",
      "service_requests": {
        "property_type": "residential",
        "location": "Kingston",
        "users": {
          "full_name": "Jane Smith",
          "email": "jane@example.com",
          "phone": "+1987654321"
        }
      }
    }
  ],
  "unreadCount": 3
}
```

### 5. **Mark Notification as Read**
**PUT** `/api/agents/notifications/:agentId`

Request body:
```json
{
  "notificationId": "uuid",
  "isRead": true
}
```

---

## Page Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/onboarding` | UserRoleSelection | Choose user role |
| `/agent/signup` | AgentSignup | Register as agent |
| `/agent/notifications` | AgentNotificationCenter | View service requests |
| `/service-request` | PremiumServiceRequest | Request agent services |

---

## User Flows

### Flow 1: Regular User → Agent
1. User signs up/logs in
2. Goes to `/onboarding`
3. Selects "Become a Verified Agent"
4. Redirected to `/agent/signup`
5. Fills out agent information (3 steps)
6. Uploads verification documents
7. Submits application
8. Status set to "pending" - awaiting admin review
9. Once approved → Agent can see notifications at `/agent/notifications`

### Flow 2: Regular User → Request Agent Service
1. User signs up/logs in
2. Goes to `/service-request`
3. Sees premium service feature
4. Makes PayPal payment ($49.99)
5. After payment, can select from verified agents
6. Submits detailed property requirements
7. Agent receives notification immediately
8. Agent reviews request and contacts client

### Flow 3: Property Owner → List Property
1. User signs up/logs in
2. Goes to `/onboarding`
3. Selects "Have a Property to Rent?"
4. Redirected to `/landlord/new-property`
5. Fills out property details
6. Can boost listing

---

## Key Features Implemented

✅ **Multi-Step Agent Registration**
- Progressive form with validation
- Document upload capability
- Clear step indicators

✅ **Real-Time Notifications**
- Agents see new requests instantly
- Unread counter
- Auto-refresh every 30 seconds

✅ **Service Request Integration**
- Users can see available verified agents
- Submit detailed requirements
- Agents get complete client information

✅ **Role-Based Access**
- Different user types (owner, agent, renter)
- Agent-specific dashboard
- Protected pages with sign-in checks

✅ **Database Support**
- Clean schema with foreign keys
- Proper indexes for performance
- Check constraints for data validation

---

## Migration Steps

To set up this feature in your database:

1. Run the SQL migrations:
```bash
# Apply service_requests table
psql -f db-migrations/001_create_service_requests.sql

# Apply agent_notifications table
psql -f db-migrations/002_create_agent_notifications.sql
```

2. Verify the tables exist:
```sql
\dt service_requests
\dt agent_notifications
```

---

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
```

---

## Frontend Dependencies Already Installed

- `@clerk/nextjs` - Authentication
- `@paypal/react-paypal-js` - Payments
- `axios` - HTTP requests
- `react-hot-toast` - Notifications
- `lucide-react` - Icons
- `tailwindcss` - Styling

---

## Testing Checklist

- [ ] Agent sign-up flow (all 3 steps)
- [ ] File upload validation
- [ ] Service request submission
- [ ] Agent notification retrieval
- [ ] Mark notification as read
- [ ] Verified agents list display
- [ ] Client contact information display
- [ ] Responsive design on mobile/tablet

---

## Notes

1. **Document Storage**: Files are stored in Supabase Storage. Update the signup API to handle actual file uploads if needed.

2. **Email Notifications**: Currently console.logs. Add email service (SendGrid, etc.) for real notifications.

3. **Admin Review**: Agent status is set to "pending" and requires manual admin approval. Add an admin dashboard to manage approvals.

4. **Payment Integration**: Uses existing PayPal integration. Verify it's configured correctly.

5. **No Existing Code Tampered**: All new features are in separate components and API routes. Existing code remains untouched.

---

## Future Enhancements

- Email notifications when agents get requests
- SMS notifications for urgent requests
- Agent rating/review system
- Request history and analytics
- Custom filters for agents
- Automated status updates
- Request expiration (30 days)
- Commission tracking
