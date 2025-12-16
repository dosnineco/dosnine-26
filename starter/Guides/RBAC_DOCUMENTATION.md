# Role-Based Access Control (RBAC) System

## Overview
Complete role-based access control system with multi-layer security for the Rentals Jamaica platform.

---

## User Roles

### 1. **Admin**
- Full access to all features
- Manage agent verifications
- View all properties and requests
- Access admin dashboard

### 2. **Verified + Paid Agent**
- View all client requests
- Receive real-time notifications
- Post unlimited properties
- Access agent dashboard
- Contact clients directly

### 3. **Verified Agent (Unpaid)**
- Limited access
- Must pay $50 to unlock features
- Cannot view client requests
- Cannot post properties

### 4. **Agent (Pending Verification)**
- All features blocked
- Waiting for admin approval
- Cannot post properties
- Cannot view requests

### 5. **Regular User**
- Browse properties
- Request an agent
- Post maximum 1 property
- View own properties
- Manage own service requests

---

## Access Control Matrix

| Feature | Admin | Paid Agent | Unpaid Agent | Pending Agent | Regular User |
|---------|-------|------------|--------------|---------------|--------------|
| Browse Properties | ✅ | ✅ | ✅ | ✅ | ✅ |
| Request Agent | ✅ | ✅ | ✅ | ❌ | ✅ |
| View Client Requests | ✅ | ✅ | ❌ | ❌ | ❌ |
| Post Properties | ✅ Unlimited | ✅ Unlimited | ❌ Blocked | ❌ Blocked | ✅ Max 1 |
| Agent Dashboard | ✅ | ✅ | ⚠️ Payment Screen | ❌ | ❌ |
| Admin Dashboard | ✅ | ❌ | ❌ | ❌ | ❌ |
| Receive Notifications | ✅ | ✅ | ❌ | ❌ | ❌ |
| Withdraw Requests | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Routes & Protection

### Public Routes (No Auth Required)
- `/` - Homepage/Browse properties
- `/property/[slug]` - Property details
- `/request-agent` - Request agent form

### Protected Routes

#### Admin Only
```javascript
// Pages
- /admin/dashboard
- /admin/agents
- /admin/visitor-emails

// Protection
useRoleProtection({
  checkAccess: isAdmin,
  redirectTo: '/dashboard',
  message: 'Admin access only'
})
```

#### Verified Agents Only
```javascript
// Pages
- /agent/dashboard
- /agent/notifications

// Protection
useRoleProtection({
  checkAccess: isVerifiedAgent,
  redirectTo: '/dashboard',
  message: 'Agent verification required'
})
```

#### Verified Unpaid Agents
```javascript
// Pages
- /agent/payment

// Protection
useRoleProtection({
  checkAccess: (data) => isVerifiedAgent(data) && needsAgentPayment(data),
  redirectTo: '/agent/dashboard',
  message: 'Invalid access'
})
```

#### Authenticated Users
```javascript
// Pages
- /dashboard
- /landlord/dashboard
- /landlord/new-property (with additional checks)

// Protection
useRoleProtection({
  requireAuth: true,
  redirectTo: '/'
})
```

---

## Utility Functions

### Location: `/lib/rbac.js`

```javascript
// Role checking
isAdmin(userData)              // Check if user is admin
isVerifiedAgent(userData)      // Check if agent verified
isPaidAgent(userData)          // Check if agent paid
canPostProperty(userData)      // Check posting permissions
canViewClientRequests(userData) // Check request access
needsAgentPayment(userData)    // Check if payment needed

// Display helpers
getUserRole(userData)          // Get role display name
getUserFeatures(userData)      // Get allowed features
getDefaultRedirect(userData)   // Get redirect path
getBlockMessage(feature, userData) // Get block reason
```

### Location: `/lib/useRoleProtection.js`

```javascript
// Hook for route protection
const { loading, hasAccess, userData, user } = useRoleProtection({
  checkAccess: (userData) => isAdmin(userData),
  redirectTo: '/dashboard',
  message: 'Access denied',
  requireAuth: true
});

// HOC for component protection
export default withRoleProtection(MyComponent, {
  checkAccess: isPaidAgent,
  redirectTo: '/agent/payment'
});
```

---

## API Route Protection

### Example: `/api/agent/requests.js`
```javascript
export default async function handler(req, res) {
  // 1. Verify user exists
  const { data: userData } = await supabase
    .from('users')
    .select('*, agent:agents(*)')
    .eq('clerk_id', clerkId)
    .single();

  // 2. Check agent status
  if (!userData.agent) {
    return res.status(403).json({ error: 'Agent profile required' });
  }

  // 3. Check verification
  if (userData.agent.verification_status !== 'approved') {
    return res.status(403).json({ error: 'Agent not verified' });
  }

  // 4. Check payment
  if (userData.agent.payment_status !== 'paid') {
    return res.status(403).json({ error: 'Payment required' });
  }

  // 5. Process request
  // ...
}
```

---

## Property Posting Flow

### Regular User
```
1. User clicks "Post Property"
2. Check property_count in database
3. If count >= 1:
   - Block submission
   - Show: "Limit reached. Become agent for unlimited"
4. If count < 1:
   - Allow submission
   - Increment property_count via trigger
```

### Agent
```
1. Agent clicks "Post Property"
2. Check verification_status:
   - pending → Block: "Verification required"
   - rejected → Block: "Verification rejected"
   - approved → Continue
3. Check payment_status:
   - unpaid → Redirect to /agent/payment
   - paid → Allow unlimited submissions
```

---

## Client Request Flow

### Regular User Submits Request
```
1. User visits /request-agent
2. Fills form with requirements
3. Submits request
4. Request saved with status='open'
5. Request visible to all paid agents
6. User can withdraw from /dashboard
```

### Agent Views Requests
```
1. Agent visits /agent/dashboard
2. Check verification: approved ✅
3. Check payment: paid ✅
4. Fetch all open requests
5. Show popup for new requests (every 30s)
6. Agent contacts client directly
```

---

## Database RLS Policies

### Service Requests
```sql
-- Users can view their own requests
CREATE POLICY "Users can view own requests"
  ON service_requests FOR SELECT
  USING (client_user_id = current_user_id());

-- Paid agents can view open requests
CREATE POLICY "Paid agents view requests"
  ON service_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.user_id = current_user_id()
      AND a.verification_status = 'approved'
      AND a.payment_status = 'paid'
    )
  );
```

### Properties
```sql
-- Property count tracked via triggers
CREATE TRIGGER increment_property_count
  AFTER INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION increment_property_count();
```

---

## Frontend Guards

### Example: Conditional Rendering
```jsx
import { canViewClientRequests, isPaidAgent } from '@/lib/rbac';

function MyComponent({ userData }) {
  return (
    <>
      {canViewClientRequests(userData) && (
        <ClientRequestsSection />
      )}
      
      {isPaidAgent(userData) ? (
        <UnlimitedPostButton />
      ) : (
        <LimitedAccessMessage />
      )}
    </>
  );
}
```

---

## Error Messages

### Property Posting
- **Regular User (limit reached)**: "Property limit reached. Regular users can post 1 property. Become a verified agent for unlimited postings!"
- **Unverified Agent**: "Agent verification pending. You cannot post properties yet."
- **Unpaid Agent**: "Payment required. Complete your agent payment to post unlimited properties."

### Client Requests
- **Regular User**: "Only verified agents can view client requests."
- **Unverified Agent**: "Agent verification pending. Please wait for admin approval."
- **Unpaid Agent**: "Payment required to access client requests."

### Admin Access
- **Non-Admin**: "Admin access only."

---

## Testing Checklist

### As Regular User
- [ ] Can browse properties
- [ ] Can submit agent request
- [ ] Can post 1 property
- [ ] Blocked from posting 2nd property
- [ ] Cannot access agent dashboard
- [ ] Cannot access admin dashboard
- [ ] Can withdraw own requests

### As Unverified Agent
- [ ] All features blocked
- [ ] See "verification pending" messages
- [ ] Cannot post properties
- [ ] Cannot view requests

### As Verified Unpaid Agent
- [ ] Redirected to payment page
- [ ] See $50 payment screen
- [ ] Cannot access dashboard features
- [ ] Payment button visible

### As Verified Paid Agent
- [ ] Full dashboard access
- [ ] Can view all client requests
- [ ] Receive popup notifications
- [ ] Can post unlimited properties
- [ ] Cannot access admin features

### As Admin
- [ ] Full access to everything
- [ ] Can verify agents
- [ ] Can view all data
- [ ] Admin dashboard accessible

---

## Security Layers

1. **Frontend Protection**
   - `useRoleProtection` hook redirects
   - Conditional rendering
   - UI guards

2. **API Protection**
   - Clerk authentication check
   - Database role verification
   - Status validation (verification, payment)

3. **Database RLS**
   - Row-level security policies
   - User-based filtering
   - Role-based queries

---

## Quick Reference

### Check if user can do something:
```javascript
import { canPostProperty, canViewClientRequests } from '@/lib/rbac';

// In component
if (canPostProperty(userData)) {
  // Show post button
}

// In API
if (!canViewClientRequests(userData)) {
  return res.status(403).json({ error: 'Access denied' });
}
```

### Protect a page:
```javascript
import { useRoleProtection } from '@/lib/useRoleProtection';
import { isPaidAgent } from '@/lib/rbac';

export default function MyPage() {
  const { loading, userData } = useRoleProtection({
    checkAccess: isPaidAgent,
    redirectTo: '/agent/payment',
    message: 'Payment required'
  });

  if (loading) return <Loading />;
  
  return <PageContent />;
}
```

---

## Files Created

- `/lib/rbac.js` - Role checking utilities
- `/lib/useRoleProtection.js` - Route protection hook
- `/pages/request-agent.js` - Client request form
- Protected: admin/*, agent/* pages with role guards
