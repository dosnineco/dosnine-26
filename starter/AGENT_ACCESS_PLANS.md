# Agent Access Plans & Premium Parish Pricing

## Overview
Agents now have tiered access plans instead of simple paid/unpaid status. Access is based on time windows with automatic expiry.

## Access Plans

### 🆓 Free Access (Starter)
- **Price**: J$0
- **Duration**: Always on
- **Access**: Limited to rental requests up to J$80,000
- **Restrictions**: No buyer leads, no purchase requests, no high-value rentals
- **Use Case**: Learning the platform, small rental transactions

### ⚡ 7-Day Access
- **Base Price**: J$3,500
- **Premium Parish Price**: J$4,500 (+J$1,000)
- **Duration**: 7 days from activation
- **Access**: All rentals up to J$80,000, buyers up to J$10,000,000
- **Restrictions**: Buyer requests over J$10M blocked
- **Use Case**: Low-risk entry, test premium features

### 🔁 30-Day Access (Most Popular)
- **Base Price**: J$10,000
- **Premium Parish Price**: J$12,000 (+J$2,000)
- **Duration**: 30 days from activation
- **Access**: Full access to all budgets and parishes
- **Restrictions**: None
- **Use Case**: Standard monthly agent subscription

### 🔒 90-Day Access (Best Value)
- **Base Price**: J$25,000
- **Premium Parish Price**: J$30,000 (+J$5,000)
- **Duration**: 90 days from activation
- **Access**: Full access with locked pricing for 90 days
- **Restrictions**: None
- **Use Case**: Committed agents, best cost-per-day value

## Premium Parishes
Agents serving these parishes pay additional fees due to higher demand and property values:
- **Kingston**
- **St. Andrew**
- **St. Catherine**

### Pricing Logic
```javascript
const premiumParishes = ['kingston', 'st. andrew', 'st andrew', 'st. catherine', 'st catherine'];
const hasPremiumParish = premiumParishes.some(parish => 
  agent.service_areas?.toLowerCase().includes(parish)
);

if (hasPremiumParish) {
  // Add premium surcharge
  prices['7-day'] = 4500;   // +1000
  prices['30-day'] = 12000;  // +2000
  prices['90-day'] = 30000;  // +5000
}
```

## Auto-Assignment Logic
Requests are auto-assigned based on **service_areas** matching:

### Assignment Rules
1. Agent must be **approved** (`verification_status = 'approved'`)
2. Agent must have **active access** (not expired, or free tier within limits)
3. Agent's **service_areas** must include the request's parish
4. Round-robin among eligible agents (sorted by `last_request_assigned_at`)

### Free Tier Restrictions
Free agents can only receive:
- Rental requests with budget ≤ J$80,000
- No buyer/purchase requests

### Example Query
```sql
SELECT id, user_id, service_areas, last_request_assigned_at
FROM agents
WHERE verification_status = 'approved'
  AND (
    -- Active paid plan
    (payment_status IN ('7-day', '30-day', '90-day') AND access_expiry > NOW())
    OR
    -- Free plan with budget restrictions
    (payment_status = 'free' AND request_budget <= 80000 AND request_type = 'rent')
  )
  AND service_areas ILIKE '%' || $request_parish || '%'
ORDER BY last_request_assigned_at ASC NULLS FIRST
LIMIT 1;
```

## Database Schema Updates

### New Columns
```sql
ALTER TABLE agents ADD COLUMN access_expiry TIMESTAMP WITH TIME ZONE;
```

### Updated Constraint
```sql
ALTER TABLE agents 
ADD CONSTRAINT agents_payment_status_check 
CHECK (
  payment_status = ANY (
    ARRAY['free'::text, '7-day'::text, '30-day'::text, '90-day'::text]
  )
);
```

### Helper Function
```sql
CREATE FUNCTION is_agent_access_expired(agent_row agents)
RETURNS BOOLEAN;
```

## Admin Management

### Cycling Through Plans
Admins can click the payment status button to cycle through plans:
1. Free → 7-Day → 30-Day → 90-Day → Free (loops)
2. Automatically calculates expiry date
3. Automatically applies premium pricing if applicable
4. Shows amount paid in UI

### Visual Indicators
- **🆓 Free**: Gray badge
- **⚡ 7-Day**: Blue badge
- **🔁 30-Day**: Green badge
- **🔒 90-Day**: Purple badge
- **Premium Parish**: Orange tag on service areas

## Migration Path
Run the migration file:
```bash
psql -d your_database -f db-migrations/020_update_agent_payment_plans.sql
```

This will:
1. Add `access_expiry` column
2. Update constraint to new values
3. Migrate existing `paid` → `30-day`, `unpaid` → `free`
4. Create helper function for expiry checks

## Frontend Updates

### Agent Payment Page
Already updated to show new plans with selection cards and bank transfer details.

### Admin Dashboard
- Shows plan badges with icons
- Displays payment amount
- Click to cycle through plans
- Shows premium parish indicator
- Displays expiry date in agent details modal

## Next Steps
1. ✅ Update database schema (run migration)
2. ✅ Update admin UI to manage new plans
3. ✅ Update payment page to show new plans
4. ⏳ Update auto-assignment API to check `access_expiry`
5. ⏳ Add expiry notification system (email agents 3 days before expiry)
6. ⏳ Create agent dashboard to show current plan and expiry
7. ⏳ Add plan upgrade/renewal flow for agents
