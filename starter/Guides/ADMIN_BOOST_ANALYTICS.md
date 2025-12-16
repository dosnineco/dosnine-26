# Admin Dashboard - Boost Analytics & Management

## Overview
Enhanced admin dashboard with comprehensive boost advertising analytics, revenue tracking, expiring dates monitoring, and hard delete functionality.

## New Features Added

### 1. **Boost Analytics Tab**
A dedicated tab showing all boost advertising data with real-time statistics.

#### Stats Overview Cards:
- **Total Revenue**: Shows total JMD revenue with USD conversion
- **Active Boosts**: Current active boosts count (max 20 slots)
- **Performance**: Average Click-Through Rate (CTR) across all boosts
- **Expiring Soon**: Count of boosts expiring within 7 days

#### Detailed Analytics:
- Total boosts count (all-time)
- Expired boosts count
- Total impressions
- Total clicks

### 2. **Boost Management Interface**

Each boost record displays:
- **Property Information**:
  - Property title (or "Property Deleted" if removed)
  - Owner name and email
  - Status badge (Active/Expired/Cancelled)
  - Days remaining indicator for active boosts

- **Performance Metrics**:
  - Revenue (JMD amount)
  - Total impressions
  - Total clicks
  - CTR percentage

- **Dates & Tracking**:
  - Boost start date/time
  - Boost end date/time
  - PayPal payment ID
  - Record creation date

### 3. **Admin Actions**

#### Cancel Boost:
- Available for active boosts only
- Marks boost as "cancelled"
- Automatically removes `is_featured` flag if no other active boosts exist
- Confirmation prompt before action

#### Hard Delete:
- Permanently deletes boost record from database
- **⚠️ WARNING**: Cannot be undone!
- Shows comprehensive confirmation dialog explaining consequences:
  - Boost record will be permanently deleted
  - Property unfeatured if no other active boosts
  - All analytics data will be lost
- Automatically cleans up property featured flag

### 4. **Visual Indicators**

#### Status Colors:
- **Green border**: Active boost
- **Gray border**: Expired boost
- **Orange border**: Cancelled boost

#### Expiring Soon Badge:
- Orange badge showing "Expires in Xd"
- Displayed when boost expires within 7 days
- Helps admins proactively monitor expiring slots

#### Tab Badge:
- Yellow badge on "Boosts" tab showing active boost count
- Updates dynamically when boosts change

## Revenue Calculations

### Total Revenue:
```javascript
totalRevenue = SUM(amount) FROM property_boosts WHERE all records
```

### Active Revenue:
```javascript
activeRevenue = COUNT(active_boosts) × 2500 JMD
```

### Conversion Display:
```javascript
USD = JMD / 100  // Approximate conversion
```

## Database Queries

### Fetch Boosts with Relations:
```sql
SELECT 
  property_boosts.*,
  properties.id, properties.title, properties.slug,
  users.id, users.full_name, users.email
FROM property_boosts
LEFT JOIN properties ON property_boosts.property_id = properties.id
LEFT JOIN users ON property_boosts.owner_id = users.id
ORDER BY property_boosts.created_at DESC
```

### Active Boosts Filter:
```javascript
status === 'active' && boost_end_date > NOW()
```

### Expiring Soon Filter:
```javascript
status === 'active' && 
boost_end_date > NOW() && 
boost_end_date <= NOW() + 7 days
```

## User Permissions

- **Admin Only**: Only users with `role = 'admin'` in the users table can access
- **Redirect**: Non-admin users see "Access Denied" message
- **Protection**: All boost management actions require admin authentication

## Performance Metrics

### Click-Through Rate (CTR):
```javascript
CTR = (Total Clicks / Total Impressions) × 100
```

### Per-Boost CTR:
```javascript
Boost CTR = (boost.clicks / boost.impressions) × 100
```

## Cleanup Actions

### When Boost is Cancelled:
1. Update boost record: `status = 'cancelled'`
2. Query remaining active boosts for same property
3. If no active boosts remain: `properties.is_featured = false`
4. Show success toast

### When Boost is Hard Deleted:
1. DELETE boost record permanently
2. Query remaining active boosts for same property
3. If no active boosts remain: `properties.is_featured = false`
4. Cannot be recovered
5. All analytics data lost

## Best Practices for Admins

### Revenue Monitoring:
- Check "Total Revenue" card for overall performance
- Compare active vs expired boosts ratio
- Monitor CTR to ensure ads are effective

### Slot Management:
- Keep track of active boosts (max 20)
- Monitor "Expiring Soon" count to prepare for new slots
- Cancel boosts if property owner violates terms

### Data Cleanup:
- Use "Cancel Boost" for temporary suspension
- Use "Hard Delete" only for:
  - Fraudulent boosts
  - Duplicate records
  - Data cleanup after property deletion
- ⚠️ Always verify before hard delete - it's permanent!

## Mobile Responsiveness

- Stats cards: 2 columns on mobile, 4 on desktop
- Boost cards: Stack vertically on mobile
- Action buttons: Horizontal on mobile, vertical on desktop
- Text truncation for long property titles
- Scrollable tabs on narrow screens

## Future Enhancements

Potential additions:
- [ ] Refund functionality
- [ ] Boost extension/renewal
- [ ] Export analytics to CSV
- [ ] Email notifications for expiring boosts
- [ ] Fraud detection flags
- [ ] Boost performance comparison charts
- [ ] Revenue trends over time

## Troubleshooting

### Boosts not showing in tab:
1. Check if `property_boosts` table exists
2. Verify admin has proper role
3. Check console for errors
4. Ensure Supabase connection is active

### Stats showing 0:
1. Verify boosts exist in database
2. Check date filters (might all be expired)
3. Ensure `amount`, `impressions`, `clicks` fields have data
4. Refresh the tab

### Hard delete not working:
1. Check RLS policies on `property_boosts` table
2. Verify admin permissions
3. Check if related property exists
4. Look for foreign key constraints

## Security Notes

- All boost operations require admin authentication
- RLS policies should allow admin full access
- Payment IDs are visible to admins for reconciliation
- Owner emails shown for support purposes
- Hard delete requires double confirmation

## API Endpoints Used

- `GET /property_boosts` - Fetch all boosts with relations
- `DELETE /property_boosts/:id` - Hard delete boost
- `UPDATE /property_boosts/:id` - Cancel boost (set status)
- `UPDATE /properties/:id` - Update featured flag
- `GET /properties` - Get property details
- `GET /users` - Get owner details

## Success Messages

- "Boost deleted permanently" - After hard delete
- "Boost cancelled" - After cancellation
- "Failed to delete boost" - Error during deletion
- "Failed to cancel boost" - Error during cancellation

---

**Important**: Always backup database before performing hard deletes on production!
