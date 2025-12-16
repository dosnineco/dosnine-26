# Agent Verification Debugging Guide

## Issue
Agents are not seeing their verification status in their dashboard after being approved.

## What Should Happen

When an admin approves an agent:
1. `agents.verification_status` is set to `'approved'`
2. `agents.payment_status` is set to `'unpaid'`  
3. `users.role` is set to `'agent'`
4. Agent receives notification email
5. Agent can now access `/agent/dashboard`
6. Dashboard shows:
   - ✅ Verified badge in header
   - ✅ "Congratulations! You're Verified" green banner
   - ✅ Payment required notice ($50 to unlock full access)

## Debugging Steps

### 1. Check Agent in Database

Run this SQL query in Supabase:

```sql
SELECT 
  u.id as user_id,
  u.clerk_id,
  u.role as user_role,
  u.created_at as user_created,
  a.id as agent_id,
  a.verification_status,
  a.payment_status,
  a.verification_reviewed_at
FROM users u
LEFT JOIN agents a ON u.id = a.user_id
WHERE u.clerk_id = 'YOUR_CLERK_ID_HERE';
```

Expected values for approved agent:
- `user_role`: `'agent'`
- `verification_status`: `'approved'`
- `payment_status`: `'unpaid'`

### 2. Test API Endpoint

Call the debug endpoint with the agent's Clerk ID:

```
GET /api/debug/agent-status?clerkId=YOUR_CLERK_ID
```

Expected response:
```json
{
  "user": {
    "id": 123,
    "clerk_id": "user_xxx",
    "role": "agent",
    "created_at": "2025-12-16..."
  },
  "agent": {
    "id": 456,
    "verification_status": "approved",
    "payment_status": "unpaid",
    "created_at": "2025-12-16...",
    "verification_reviewed_at": "2025-12-16..."
  },
  "checks": {
    "hasAgent": true,
    "isVerified": true,
    "hasPaid": false,
    "userRole": "agent",
    "isAgentRole": true
  }
}
```

### 3. Check Browser Console

After agent logs in and tries to visit `/agent/dashboard`, check browser console for these logs:

```
useRoleProtection - Fetched user data: {...}
useRoleProtection - Agent data: {...}
useRoleProtection - User role: "agent"
isVerifiedAgent check: {
  hasAgent: true,
  verificationStatus: "approved",
  expectedStatus: "approved",
  result: true
}
useRoleProtection - Access check result: true
Agent Dashboard - User Data: {...}
Agent Dashboard - Agent Data: {...}
Agent Dashboard - Verification Status: "approved"
Agent Dashboard - Payment Status: "unpaid"
```

## Common Issues

### Issue 1: Agent can't access dashboard (redirected away)

**Symptoms:**
- Agent tries to visit `/agent/dashboard`
- Gets toast: "Agent verification required"
- Redirected to `/dashboard`

**Possible Causes:**
1. `verification_status` is not `'approved'` in database
2. Agent record doesn't exist
3. `/api/user/profile` not returning agent data properly

**Fix:**
- Check database values (Step 1 above)
- If status is wrong, run:
  ```sql
  UPDATE agents 
  SET verification_status = 'approved', 
      payment_status = 'unpaid'
  WHERE user_id = (SELECT id FROM users WHERE clerk_id = 'YOUR_CLERK_ID');
  ```

### Issue 2: Agent can access dashboard but doesn't see verification message

**Symptoms:**
- Agent successfully loads `/agent/dashboard`
- No green "Congratulations" banner
- No verification indicators

**Possible Causes:**
1. `showPaymentRequired` state is false
2. Agent data not loading properly
3. Payment status is already 'paid'

**Fix:**
- Check console logs to see what data is received
- Verify `payment_status` in database is `'unpaid'`

### Issue 3: User role not updated to 'agent'

**Symptoms:**
- Database shows agent is approved
- But user can't access agent features
- `users.role` is still `'user'`

**Fix:**
Run this SQL to update the role:
```sql
UPDATE users 
SET role = 'agent'
WHERE id = (
  SELECT user_id FROM agents 
  WHERE verification_status = 'approved' 
  AND user_id = (SELECT id FROM users WHERE clerk_id = 'YOUR_CLERK_ID')
);
```

## Code Flow

1. **Agent applies** → `POST /api/agents/signup` → Creates agent record with status='pending'
2. **Admin approves** → `POST /api/admin/agents/update-status` → Sets status='approved', payment='unpaid', role='agent'
3. **Agent visits dashboard** → `/agent/dashboard` page
4. **useRoleProtection hook** → Calls `GET /api/user/profile?clerkId=xxx`
5. **API returns data** → User object with nested agent object
6. **isVerifiedAgent check** → Verifies `agent.verification_status === 'approved'`
7. **If verified** → Shows dashboard with payment required banner
8. **If not verified** → Redirects to `/dashboard` with error

## Files Modified for Debugging

- `/pages/agent/dashboard.js` - Added console logs for agent data
- `/lib/useRoleProtection.js` - Added console logs for API response and access checks
- `/lib/rbac.js` - Added console logs for verification status check
- `/pages/api/debug/agent-status.js` - NEW debug endpoint to check agent status

## Next Steps

1. Have the agent log in and try to access `/agent/dashboard`
2. Check browser console for the logs mentioned in Step 3
3. Call the debug API endpoint with their Clerk ID
4. Run the SQL query to verify database values
5. Share the results to identify the specific issue
