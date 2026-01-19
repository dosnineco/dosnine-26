# Implementation Guide: AutoAssign Modal with Pricing Plans

## Quick Start

### 1. Run Database Migration
To add budget filtering support, run the migration:

```bash
# Via Supabase SQL Editor
# Copy and paste the contents of:
# db-migrations/021_add_budget_min_max_to_service_requests.sql
```

Or use the Supabase dashboard:
1. Go to SQL Editor
2. Create new query
3. Paste migration SQL
4. Execute

### 2. Component Integration

The updated AutoAssignModal is automatically integrated in `/pages/admin/requests.js`.

New props available:
- `budgetMin`: Minimum budget filter (default: 10,000)
- `budgetMax`: Maximum budget filter (default: 100,000,000)
- `onBudgetMinChange`: Callback for min budget changes
- `onBudgetMaxChange`: Callback for max budget changes

### 3. Usage Flow

1. **Admin clicks "AutoAssign" button** on admin requests page
2. **Modal opens** with agent selection dropdown
3. **Select an agent** → Shows their current plan details
4. **Adjust budget range** using slider or quick presets
5. **Set number of requests** and inclusion preferences
6. **Click "Assign Now"** → System filters and assigns requests

## Plan Details Display

When an agent is selected, the modal shows:

```
┌─────────────────────────────────────┐
│ Current Plan                        │
│                                     │
│ 30-Day Access                       │ Active (30 days)
│ Full access to all requests         │ J$10,000
│ and features                        │ 30 days
│                                     │
│ Access Details:                     │
│ ✓ All Access                        │
│ ✓ All budgets and requests included │
│ ✓ All sales                         │
└─────────────────────────────────────┘
```

## Budget Range Filtering

The dual-slider allows selecting:
- **Min Budget**: J$10,000 (starting point)
- **Max Budget**: J$100,000,000+ (end point)

Quick presets cover:
- Small properties (J$10K-J$50K)
- Mid-range (J$50K-J$500K)
- Commercial (J$500K-J$5M)
- Premium (J$5M+)

## Data Flow

```
Admin Request Page
    ↓
[AutoAssign Modal]
    ├─ Select Agent → Load payment_status + access_expiry
    ├─ Set Budget Range → Update budgetMin/budgetMax
    ├─ Configure Assignment → Set count, includeBuys
    └─ Submit → Filter requests by:
         1. Status = 'open'
         2. Budget within range
         3. Agent plan eligibility
         4. Request type allowance
         5. Request type not 'buy' (unless enabled)
         6. Oldest first
    ↓
[Assign to service_requests table]
    ├─ Update assigned_agent_id
    ├─ Set status = 'assigned'
    ├─ Record assigned_at timestamp
    └─ Update agent's last_request_assigned_at
```

## Database Schema

### service_requests table
```sql
budget_min DECIMAL(12, 2)     -- Minimum budget (e.g., 10000)
budget_max DECIMAL(12, 2)     -- Maximum budget (e.g., 100000000)
```

### agents table (existing)
```sql
payment_status TEXT            -- 'free', '7-day', '30-day', '90-day'
access_expiry TIMESTAMP        -- When plan expires
last_request_assigned_at TIMESTAMP  -- Last assignment time
```

## Budget Range Slider Implementation

The slider uses logarithmic scaling:

```javascript
// Convert budget to log scale for slider
const sliderValue = Math.log10(budget);

// Example values:
// J$10,000     → 4.0
// J$100,000    → 5.0
// J$1,000,000  → 6.0
// J$10,000,000 → 7.0
// J$100,000,000 → 8.0
```

This provides smooth control across a wide budget range.

## Testing

### Test Scenario 1: Free Agent
1. Select agent with 'free' plan
2. Budget range should show max J$80K restriction info
3. Can only see rental requests

### Test Scenario 2: Premium Agent
1. Select agent with '30-day' or '90-day' plan
2. All budget levels available
3. All request types shown

### Test Scenario 3: Budget Filtering
1. Set budget min: J$1M
2. Set budget max: J$5M
3. Only requests in this range should be available for assignment

## Color Coding

- 🟢 **Green** (Free): No cost, limited access
- 🟡 **Amber** (7-Day): Entry level plan
- 🔵 **Blue** (30-Day): Most popular, full access
- 🟣 **Violet** (90-Day): Best value premium
- 🔴 **Red** (Expired): Plan has expired

## Troubleshooting

### Issue: Budget slider not working
**Solution**: Ensure `onBudgetMinChange` and `onBudgetMaxChange` callbacks are passed to modal

### Issue: Plan not showing for selected agent
**Solution**: Verify agent has `payment_status` and `access_expiry` columns populated in database

### Issue: No requests eligible for assignment
**Solution**: Check:
1. Budget range overlaps with requests
2. Agent plan allows request type
3. Requests exist with status = 'open'
4. Agent's service_areas match request location

## Future Enhancements

1. **Request Preview**: Show requests that will be assigned before confirming
2. **Batch Operations**: Assign to multiple agents simultaneously
3. **Scheduling**: Schedule assignments for future times
4. **Analytics**: Track assignment success rates by budget range
5. **AI Optimization**: Suggest optimal budget ranges based on history
6. **Custom Ranges**: Save favorite budget configurations per agent

## Support

For issues or questions, refer to:
- Database schema: `db-migrations/020_update_agent_payment_plans.sql`
- Pricing config: `lib/pricingPlans.js`
- Component code: `components/AutoAssignModal.js`
- Admin page: `pages/admin/requests.js`
