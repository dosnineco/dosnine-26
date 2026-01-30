# Admin Request Management System

A powerful admin dashboard for managing service requests with bulk operations, advanced filtering, and sorting capabilities.

## Features

### 1. **Mass Selection**
- Checkbox for individual request selection
- "Select All" checkbox to select all filtered requests
- Clear selection button for quick reset

### 2. **Bulk Actions** (Admin Only)
- **Assign to Agent**: Bulk assign multiple requests to a specific agent
- **Mark Completed**: Mark multiple requests as completed
- **Mark Incomplete**: Revert completed requests back to open status
- **Unassign to Queue**: Move assigned requests back to the open queue for redistribution
- **Reactivate**: Reactivate closed or inactive requests
- **Delete**: Permanently delete selected requests

### 3. **Advanced Filtering**
- **Search**: Search by client name, email, phone number, or location
- **Date Filter**: Filter requests by specific date (edited date)
- **Status Filter**: Filter by All, Open, Active, or Completed status
- **Clear Filters**: One-click button to reset all filters

### 4. **Sorting Options**
- Edited Date (Newest/Oldest)
- Created Date (Newest/Oldest)
- Client Name (A-Z)

### 5. **Request Details Display**
- Client name with request type
- Contact information (email & phone)
- Request type badge
- Property location
- Request status with color coding
- Agent assignment status
- Last edited date

## Access Requirements

- **Admin-only access** - Verified via `users` table in Supabase
- User must have `role = 'admin'` in the database
- Access is checked dynamically on each visit

## Getting Started

### 1. Set Admin Role in Database
Run this SQL in your Supabase console:

```sql
-- Update your email to admin
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Verify admin was set
SELECT id, email, role, created_at
FROM public.users 
WHERE role = 'admin';
```

The system automatically queries the `users` table to verify admin status - no code changes needed!

## Database Requirements

### `users` table (required for admin check)
```sql
- id (uuid, primary key)
- email (text, unique)
- role (text): 'admin', 'agent', 'user', etc.
- full_name (text, nullable)
- phone (text, nullable)
- created_at (timestamp)
```

### `service_requests` table
```sql
- id (uuid, primary key)
- client_name (text)
- client_email (text)
- client_phone (text)
- request_type (text): buy, sell, rent, lease, valuation
- location (text)
- status (text): open, assigned, completed, deleted
- assigned_agent_id (uuid, foreign key)
- created_at (timestamp)
- updated_at (timestamp)
- completed_at (timestamp, nullable)
- budget_min (numeric, nullable)
- budget_max (numeric, nullable)
- bedrooms (integer, nullable)
- bathrooms (integer, nullable)
- description (text, nullable)
- urgency (text, nullable)
```

### `agents` table
```sql
- id (uuid, primary key)
- name (text)
- email (text)

## Usage Examples

### Bulk Assign Requests
1. Use filters to find requests you want to assign
2. Select multiple requests using checkboxes
3. Click "Assign to Agent"
4. Choose agent from dropdown
5. Click "Assign"

### Mark Requests as Completed
1. Find requests to mark (use search/filters)
2. Select with checkboxes
3. Click "Mark Completed"
4. Done! Status updates instantly

### Unassign to Queue
1. Select assigned requests
2. Click "Unassign to Queue"
3. Requests revert to "open" status for redistribution
4. No agent assignment

### Filter by Date
1. Click the "Filter by Date" field
2. Select a specific date
3. Table shows only requests edited on that date
4. Combine with other filters for more precision

### Search Requests
1. Enter search term in "Search" field
2. Searches across:
   - Client name
   - Email address
   - Phone number
   - Property location
3. Results update in real-time

## Status Meanings

| Status | Color | Meaning |
|--------|-------|---------|
| open | Yellow | Unassigned, waiting for agent |
| assigned | Purple | Assigned to an agent |
| completed | Green | Request completed |
| deleted | Gray | Deleted/archived |

## Security Notes

1. **Database-driven admin check**: Routes query the `users` table for `role = 'admin'`
2. **Clerk integration**: Uses Clerk for authentication, Supabase for role verification
3. **Dynamic verification**: Admin status checked on every page load from database
4. **RLS recommended**: Set up Row Level Security on Supabase for additional protection
5. **Audit trail**: All updates include timestamps via `updated_at`

## API Endpoints Used

All operations go through Supabase:
- `GET /service_requests` - Fetch all requests
- `GET /agents` - Fetch all agents
- `UPDATE /service_requests` - Update request(s)
- `DELETE /service_requests` - Delete request(s)

## Bulk Operation Examples

### Assign 10 Requests to an Agent
```javascript
// Select 10 requests with checkboxes
// Click "Assign to Agent"
// Select agent from modal
// Click "Assign"
// All 10 requests updated in parallel with toast notifications
```

### Mark All Overdue Requests Complete
```javascript
// Filter by created date (older than X days)
// Select all with checkbox
// Click "Mark Completed"
// completed_at timestamp is set
// Status changes to "completed"
```

### Clear Old Requests from Queue
```javascript
// Filter by date (e.g., older than 90 days)
// Filter by status "open"
// Select all unassigned requests
// Click "Delete"
// Confirmation required before deletion
```

## Performance Notes

- Bulk operations process updates sequentially to ensure data consistency
- Large bulk operations (100+) may take a few seconds
- Loading indicators show operation progress
- Toast notifications confirm completion or errors

## Troubleshooting

### "You do not have admin access"
- Check that your `users` table entry has `role = 'admin'`
- Verify your email matches exactly in the database
- Make sure you're signed in with the correct Clerk account
- Run the SQL: `SELECT email, role FROM public.users WHERE email = 'your-email@example.com';`
- Update with: `UPDATE public.users SET role = 'admin' WHERE email = 'your-email@example.com';`

### Agents not showing in dropdown
- Ensure agents table exists in Supabase
- Check that agents have id, name, and email fields
- Verify database connection

### Bulk actions not working
- Check browser console for errors
- Verify Supabase RLS policies allow updates
- Ensure selected count is > 0
- Try with smaller bulk operation first

### Filters not applying
- Clear filters and try again
- Check date format (should be YYYY-MM-DD)
- Ensure search term is spelled correctly
- Refresh page if filters seem stuck

## Future Enhancements

- [ ] Bulk status change with confirmation
- [ ] CSV export of filtered results
- [ ] Batch email notifications to selected agents
- [ ] Request priority management
- [ ] Agent assignment history/audit log
- [ ] Performance metrics dashboard
- [ ] Automated assignment rules
- [ ] Request duplicate detection
