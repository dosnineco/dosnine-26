# Fair Request Allocation System

## Overview
Automated system that distributes client service requests equally among all paid agents using a round-robin algorithm.

## How It Works

### 1. **Round-Robin Distribution**
- New requests are automatically assigned to the agent who received a request longest ago
- If an agent has never received a request, they get priority
- Ensures equal distribution over time

### 2. **Eligibility Requirements**
Only agents meeting these criteria receive requests:
- ✅ Verification status: `approved`
- ✅ Payment status: `paid`
- ✅ Active account

### 3. **Assignment Process**
```
Client submits request
    ↓
System creates request record (status: 'open')
    ↓
Auto-assignment triggered
    ↓
Query all paid agents, sort by last_request_assigned_at (oldest first)
    ↓
Assign to agent at top of queue
    ↓
Update request (status: 'assigned', assigned_agent_id, assigned_at)
    ↓
Update agent (last_request_assigned_at = NOW())
    ↓
Send notification to agent
```

### 4. **Uniqueness Guarantee**
- Each request is assigned to **exactly one agent**
- No duplicate assignments
- Once assigned, request cannot be reassigned automatically

## Database Changes

### New Column: `agents.last_request_assigned_at`
- Type: `TIMESTAMPTZ`
- Purpose: Track when agent last received a request
- Used for: Round-robin sorting (oldest first)

### Migration File
Run `011_fair_request_allocation.sql` in Supabase SQL Editor:
```sql
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS last_request_assigned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_agents_last_request_assigned 
ON public.agents(last_request_assigned_at);
```

## API Endpoints

### POST `/api/service-requests/auto-assign`
Automatically assigns a request to the next agent in queue.

**Request Body:**
```json
{
  "requestId": "uuid-of-request"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Request assigned successfully",
  "assigned": true,
  "agentId": "uuid-of-agent"
}
```

### Automatic Trigger
Called automatically when a new request is created via `/api/service-requests/create`.

## Admin Dashboard

### Request Allocation Monitor
URL: `/admin/allocation`

**Features:**
- View total active agents
- See total requests (assigned vs open)
- Monitor distribution across agents
- See queue order (who gets next request)
- Request count per agent

**Key Metrics:**
- **Active Agents**: Number of paid agents eligible for requests
- **Total Requests**: All requests in system
- **Assigned**: Requests currently with agents
- **In Queue**: Open requests awaiting assignment

## Agent View

### Agent Dashboard
Agents see only requests assigned to them:
- Can view all assigned requests
- Filter by status (open, in progress, completed)
- Cannot see requests assigned to other agents

## Fairness Algorithm

### Example Scenario
**3 Paid Agents:**
1. Agent A - Last assigned: 2 hours ago (5 total requests)
2. Agent B - Last assigned: 1 hour ago (4 total requests)
3. Agent C - Last assigned: Never (0 total requests)

**Queue Order:**
1. **Agent C** (Never assigned - gets next request)
2. Agent A (Oldest assignment)
3. Agent B (Most recent assignment)

**After New Request:**
- Agent C receives request
- Agent C's `last_request_assigned_at` = NOW()
- New queue order: A → B → C

### Over Time
After 10 requests with 3 agents:
- Agent A: ~3-4 requests
- Agent B: ~3-4 requests
- Agent C: ~3-4 requests

Perfect distribution achieved automatically!

## Benefits

### For Agents
- ✅ Equal opportunity to all paid agents
- ✅ Transparent and fair system
- ✅ Predictable request flow
- ✅ No favoritism or bias

### For Clients
- ✅ Fast automatic assignment
- ✅ Agent always available
- ✅ Consistent service quality

### For Business
- ✅ Scalable to any number of agents
- ✅ Zero manual intervention
- ✅ Maximizes agent satisfaction
- ✅ Reduces support tickets

## Monitoring & Analytics

### Admin Can Track:
- Request distribution across agents
- Average requests per agent
- Queue position for each agent
- Last assignment timestamps
- Fairness metrics

### Reports Available:
- Agent performance (requests handled)
- Response times
- Completion rates
- Load balancing effectiveness

## Edge Cases Handled

### 1. No Paid Agents Available
- Request remains `open`
- Can be manually assigned later
- No errors thrown

### 2. Agent Goes Inactive
- Remove from eligible pool
- Existing assigned requests remain
- No new requests assigned

### 3. Request Already Assigned
- Skip re-assignment
- Maintain existing assignment
- Log duplicate attempt

### 4. Multiple Simultaneous Requests
- Database-level locking prevents conflicts
- Each request gets unique agent
- FIFO order maintained

## Configuration

### Environment Variables
None required - system works out of the box!

### Customization Options
Edit `/api/service-requests/auto-assign.js` to:
- Change sorting algorithm
- Add priority tiers
- Implement specialty matching
- Add business hours filtering

## Testing

### Verify Auto-Assignment
1. Create a new service request via "Find Agent" form
2. Check request in database: `status` should be 'assigned'
3. Check `assigned_agent_id` is populated
4. Verify `assigned_at` timestamp

### Monitor Distribution
1. Go to `/admin/allocation`
2. Submit multiple requests
3. Observe request counts increase evenly
4. Check queue order updates correctly

## Troubleshooting

### Requests Not Being Assigned
- Check if any agents have `payment_status = 'paid'`
- Verify agent `verification_status = 'approved'`
- Check console for auto-assign API errors

### Uneven Distribution
- Check `last_request_assigned_at` timestamps
- Verify index exists on column
- Ensure no manual assignments interfering

### Agent Not Receiving Requests
- Confirm payment status is 'paid'
- Verify verification status is 'approved'
- Check if agent is last in queue (most recent assignment)

## Future Enhancements

### Possible Additions:
1. **Specialty Matching**: Assign based on agent expertise
2. **Geographic Priority**: Match agent location to request
3. **Load Limits**: Cap max requests per agent
4. **Business Hours**: Only assign during agent's working hours
5. **Performance-Based**: Prioritize high-rated agents
6. **Client Preferences**: Allow clients to request specific agent types

## Summary
The Fair Request Allocation System ensures every paid agent receives equal opportunities through an automated, transparent, and scalable round-robin distribution algorithm. No manual intervention required!
