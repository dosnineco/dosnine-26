# Fair Request Allocation System

## Overview
The platform uses a **Round-Robin Algorithm** to distribute client requests fairly among all verified and paid agents. This ensures every agent gets equal opportunities to receive leads.

## How It Works

### Algorithm Logic
1. **Eligibility**: Only agents with `verification_status='approved'` AND `payment_status='paid'` receive requests
2. **Queue Sorting**: Agents are sorted by `last_request_assigned_at` (ascending, NULL values first)
3. **Assignment**: The agent at the top of the queue gets the next request
4. **Timestamp Update**: After assignment, agent's `last_request_assigned_at` is updated to current time
5. **Rotation**: Updated timestamp moves agent to back of queue, giving others a turn

### Why Round-Robin?
- **Fair Distribution**: Every agent gets equal opportunities over time
- **New Agent Priority**: Agents who never received requests (NULL timestamp) get priority
- **Transparent**: Clear, predictable order based on objective timestamp
- **Scalable**: Works efficiently with any number of agents
- **No Bias**: Pure rotation, no favoritism or manual intervention

## API Endpoints

### Auto-Assign Request
**POST** `/api/service-requests/auto-assign`
```json
{
  "requestId": "uuid"
}
```

Automatically assigns an open request to the next agent in queue.

**Response:**
```json
{
  "success": true,
  "message": "Request assigned successfully",
  "assigned": true,
  "agentId": "uuid"
}
```

### Manual Assign Request
**POST** `/api/agent/assign-request`
```json
{
  "requestId": "uuid"
}
```

Same logic as auto-assign, but returns detailed information about algorithm decision.

**Response:**
```json
{
  "success": true,
  "message": "Request assigned successfully",
  "agent": {
    "id": "uuid",
    "name": "Agent Name",
    "email": "agent@example.com"
  },
  "algorithm": "round-robin",
  "reason": "Agent last received request on 12/15/2025"
}
```

### Update Request Status
**POST** `/api/agent/update-request`
```json
{
  "clerkId": "clerk_user_id",
  "requestId": "uuid",
  "action": "complete" // or "release" or "remove"
}
```

**Actions:**
- `complete`: Mark request as completed
- `release`: Release request back to queue, auto-assigns to next agent
- `remove`: Cancel/remove request from system

## Agent Actions

Agents can manage their requests with three actions:

### 1. Mark as Complete ✓
- Sets request `status='completed'`
- Records `completed_at` timestamp
- Request stays in agent's history

### 2. Release to Next Agent 🔄
- Sets request `status='open'`
- Removes `assigned_agent_id`
- Automatically reassigns to next agent in queue
- Useful when agent can't fulfill request

### 3. Remove from Dashboard 🗑️
- Sets request `status='cancelled'`
- Removes from agent's view
- Request becomes inactive

## Database Schema

### Required Columns

**agents table:**
```sql
last_request_assigned_at TIMESTAMPTZ
  -- NULL = never assigned, gets priority
  -- Updated after each assignment
```

**service_requests table:**
```sql
assigned_agent_id UUID REFERENCES agents(id)
status VARCHAR -- 'open', 'assigned', 'completed', 'cancelled'
assigned_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
```

## Admin Dashboard

View allocation statistics at `/admin/allocation`

**Shows:**
- Total active agents
- Total requests
- Assigned vs open requests
- Agent distribution table (sorted by queue position)
- Next agent in queue highlighted

## Fair Allocation Benefits

### For Agents:
- ✅ Equal opportunity for all agents
- ✅ New agents get leads immediately
- ✅ Predictable, transparent system
- ✅ No competition or bidding wars

### For Clients:
- ✅ Fast assignment (always someone available)
- ✅ Consistent service quality
- ✅ Agents are motivated (guaranteed leads)

### For Platform:
- ✅ Automated, no manual intervention
- ✅ Scales with agent growth
- ✅ Fair = happy agents = retention
- ✅ Simple to maintain and audit

## Algorithm Comparison

Why we chose Round-Robin over alternatives:

| Algorithm | Pros | Cons |
|-----------|------|------|
| **Round-Robin** ✅ | Fair, simple, transparent, scalable | None significant |
| K-Nearest Neighbors (KNN) | Location-based matching | Complex, requires location data, less fair |
| Random | Simple | Unfair, some agents get more than others |
| First-Come-First-Serve | Simple | Favors fast responders, creates competition |
| Auction/Bidding | Market-driven | Unfair to new agents, race to bottom pricing |

## Testing

To test the allocation system:

1. **Create Test Agents:**
   ```sql
   -- Ensure multiple agents with paid status
   SELECT id, full_name, last_request_assigned_at 
   FROM agents 
   WHERE verification_status='approved' 
   AND payment_status='paid'
   ORDER BY last_request_assigned_at ASC NULLS FIRST;
   ```

2. **Submit Test Request:**
   Use the "Find Agent" form or API to create a service request

3. **Verify Assignment:**
   Check that agent with NULL or oldest `last_request_assigned_at` received it

4. **Check Rotation:**
   Submit multiple requests, verify different agents receive them in order

## Monitoring

Key metrics to track:
- Average requests per agent
- Time between assignments per agent
- Distribution variance (should be low)
- Requests in queue vs assigned

## Future Enhancements

Potential improvements:
- [ ] Agent availability status (vacation mode)
- [ ] Specialization-based routing (before round-robin)
- [ ] Geographic preference matching
- [ ] Performance-based weighting
- [ ] Agent capacity limits (max concurrent requests)

## Support

For issues or questions about the allocation system:
- Check `/admin/allocation` dashboard
- Review API logs for assignment patterns
- Verify agent eligibility status
- Check `last_request_assigned_at` timestamps

---

**Jamaica Real Estate Dealer Verification:**
All agents are verified against the Jamaica Real Estate Board: https://reb.gov.jm/search-public-register/dealer
