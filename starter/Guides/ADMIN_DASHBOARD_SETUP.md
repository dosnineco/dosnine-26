# Admin Dashboard Setup Checklist

## ✅ Implementation Complete

### Features Added:
1. **Boost Analytics Tab** with real-time statistics
2. **Revenue Tracking** (JMD and USD conversion)
3. **Expiring Dates Monitoring** (7-day warning system)
4. **Hard Delete Feature** with confirmation dialog
5. **Cancel Boost** functionality
6. **Visual Status Indicators** (active/expired/cancelled)
7. **Performance Metrics** (CTR, impressions, clicks)

## 🔧 Required Setup Steps

### 1. Apply Database Schema (REQUIRED)
You must run the SQL schema before the admin dashboard will work:

```bash
# Navigate to your Supabase dashboard
# SQL Editor → New Query → Paste contents of /supabase.sql
# Click "Run" to execute
```

**File location**: `/workspaces/dosnine-26/starter/supabase.sql`

**What it creates**:
- `property_boosts` table with all columns
- Indexes for performance (status, dates, property_id)
- Proper data types and constraints

### 2. Configure Row Level Security (REQUIRED)

Add these RLS policies in Supabase dashboard:

```sql
-- Admin full access to property_boosts
CREATE POLICY "admin_full_access"
ON property_boosts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Users can view their own boosts
CREATE POLICY "users_view_own"
ON property_boosts
FOR SELECT
USING (owner_id = auth.uid());

-- Users can insert their own boosts
CREATE POLICY "users_insert_own"
ON property_boosts
FOR INSERT
WITH CHECK (owner_id = auth.uid());
```

### 3. Grant Admin Role to Your Account

Update your user record in Supabase:

```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';
```

### 4. Test the Dashboard

1. Navigate to: `http://localhost:3001/admin/dashboard`
2. Click the "Boosts" tab (yellow button with ⚡ icon)
3. Verify you see:
   - 4 stat cards at the top
   - Analytics overview section
   - Empty state message (if no boosts yet)

## 📊 Testing Boost Analytics

### Create Test Boost:
1. Go to landlord dashboard
2. Click "Boost" button on any property
3. Complete PayPal payment (use sandbox mode)
4. Return to admin dashboard → Boosts tab
5. Verify boost appears with all data

### Test Hard Delete:
1. Click "Hard Delete" button on a boost
2. Confirm dialog shows warning
3. Click OK
4. Verify boost is removed from list
5. Check property is unfeatured (if no other active boosts)

### Test Cancel Boost:
1. Find an active boost
2. Click "Cancel Boost" button
3. Confirm cancellation
4. Verify status changes to "Cancelled"
5. Check property is unfeatured

## 🎨 UI Components

### New Icons Used:
- `FiZap` - Boost indicator
- `FiDollarSign` - Revenue
- `FiClock` - Expiring soon
- `FiTrendingUp` - Performance/CTR
- `FiTrash2` - Hard delete

All icons from `react-icons/fi` (already installed).

### Color Scheme:
- **Green gradient**: Revenue card
- **Blue gradient**: Active boosts card  
- **Purple gradient**: Performance card
- **Orange gradient**: Expiring soon card
- **Yellow**: Boost tab highlight

### Responsive Design:
- Stats: 2 columns mobile → 4 columns desktop
- Boost cards: Stack vertically on mobile
- Action buttons: Horizontal mobile → Vertical desktop

## 📁 Files Modified

1. `/pages/admin/dashboard.js` (234 → 557 lines)
   - Added Boosts tab
   - Added boost analytics section
   - Added hard delete & cancel functions
   - Added stats calculations

## 📖 Documentation Created

1. `/ADMIN_BOOST_ANALYTICS.md` - Detailed feature documentation
2. `/ADMIN_DASHBOARD_SETUP.md` - This setup guide

## 🔍 Verification Checklist

- [ ] Database schema applied in Supabase
- [ ] RLS policies configured
- [ ] Admin role assigned to your account
- [ ] Can access `/admin/dashboard` without "Access Denied"
- [ ] "Boosts" tab appears between "Properties" and "Users"
- [ ] Active boost count badge shows on tab (if boosts exist)
- [ ] 4 stat cards display at top of Boosts tab
- [ ] Analytics overview section shows totals
- [ ] Boost list displays all records with full details
- [ ] "Cancel Boost" button works on active boosts
- [ ] "Hard Delete" button shows confirmation dialog
- [ ] Property gets unfeatured after deleting last boost
- [ ] Mobile responsive layout works correctly

## 🚀 Next Steps

### For Production:
1. **Backup Database** before allowing hard deletes
2. **Enable PayPal Live Mode** (change client ID)
3. **Set Up Monitoring** for revenue tracking
4. **Configure Email Alerts** for expiring boosts
5. **Add Audit Logging** for hard delete actions

### Optional Enhancements:
- Export analytics to CSV
- Revenue trend charts
- Refund functionality
- Boost extension/renewal
- Fraud detection flags
- Email notifications

## 🐛 Troubleshooting

### Issue: "Access Denied" on dashboard
**Solution**: Check if your user has `role = 'admin'` in users table

### Issue: Boosts tab shows empty
**Solution**: 
1. Check if `property_boosts` table exists
2. Verify RLS policies allow admin access
3. Check browser console for errors

### Issue: Hard delete doesn't work
**Solution**:
1. Verify RLS policy: `admin_full_access` with DELETE permission
2. Check foreign key constraints
3. Look for console errors

### Issue: Revenue shows incorrect amount
**Solution**:
1. Verify `amount` column is numeric (not string)
2. Check all boost records have valid amounts
3. Refresh the page

### Issue: Stats cards show 0
**Solution**:
1. Ensure boosts exist in database
2. Check date formats are valid
3. Verify status values match exactly ('active', 'expired', 'cancelled')

## 📞 Support

If you encounter issues:
1. Check browser console for JavaScript errors
2. Check Supabase logs for database errors
3. Verify all RLS policies are active
4. Review `/ADMIN_BOOST_ANALYTICS.md` for detailed documentation

## ✨ Features Summary

### What Admins Can Do:
✅ View all boosts (active, expired, cancelled)
✅ See total revenue in JMD and USD
✅ Monitor active boost slots (max 20)
✅ Track performance metrics (CTR, impressions, clicks)
✅ Get alerts for expiring boosts (within 7 days)
✅ Cancel active boosts
✅ Permanently delete boost records
✅ View property and owner details
✅ See payment IDs for reconciliation
✅ Filter by status visually (color-coded borders)

---

**Status**: Implementation Complete ✅  
**Server**: Running on http://localhost:3001  
**Next Action**: Apply database schema in Supabase dashboard
