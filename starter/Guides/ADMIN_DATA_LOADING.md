# 📊 Admin Dashboard - Data Loading Guide

## Quick Start

### 1. Verify Setup
Go to: `http://localhost:3002/test-agents-data`

This test page will show:
- ✅ Current user role (should be admin)
- ✅ Agent count (total, pending, approved)
- ✅ Sample agent data with user info
- ✅ Document URLs
- ✅ Any errors in data fetching

### 2. Access Admin Dashboard
Go to: `http://localhost:3002/admin/agents`

Should show:
- Stats cards (Total, Pending, Approved, Rejected)
- Agent list table with all data
- Filter buttons (All, Pending, Approved, Rejected)
- Actions: 👁️ View | ✓ Approve | ✗ Reject

### 3. View Agent Details
1. Click 👁️ (eye icon) on any agent
2. Modal opens with:
   - Personal info (name, email, phone)
   - Business details
   - **Verification documents** (images)
3. Click Approve or Reject

---

## Data Flow

### Agent Signup → Database
```
User submits agent form
    ↓
Documents upload to agent-documents bucket
    ↓
API creates record in agents table
    ↓
verification_status = 'pending'
```

### Admin Dashboard → Display
```
Admin opens /admin/agents
    ↓
Frontend: Verify user is admin
    ↓
API: /api/admin/agents/list
    → Verify admin role
    → Query agents table + join users table
    → Convert storage paths to URLs
    ↓
Frontend: Display agents in table
```

### View Documents
```
Admin clicks 👁️ to view agent
    ↓
Frontend: Call loadDocumentUrls()
    ↓
API: /api/admin/agents/get-document
    → Verify admin role
    → Generate signed URL (1 hour expiry)
    ↓
Frontend: Display images in modal
```

---

## Document URL Formats

### Stored in Database
```
agent-documents/user-id/license-uuid.jpg
agent-documents/user-id/registration-uuid.jpg
```

### Signed URL (for viewing)
```
https://[project].supabase.co/storage/v1/object/sign/agent-documents/user-id/file.jpg?token=...
```

### Public URL (fallback)
```
https://[project].supabase.co/storage/v1/object/public/agent-documents/user-id/file.jpg
```

---

## Troubleshooting

### No agents showing in dashboard
**Check:**
1. Run test page: `/test-agents-data`
2. Check agent count - should show total
3. If 0 agents, create test agent via `/agent/signup`
4. Check browser console for API errors

**Solution:**
```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM agents;
-- Should return count > 0

SELECT * FROM agents LIMIT 5;
-- Should show agent records
```

### "Access Denied" error
**Check:**
1. Test page shows role = 'admin'?
2. If not, run `007_setup_admin.sql` with your email

**Solution:**
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Documents not displaying
**Check:**
1. Test page shows document URLs?
2. Are URLs starting with `https://`?
3. Browser console shows image errors?

**Solutions:**

**A) If URLs are paths only (no https://):**
```sql
-- Check how paths are stored
SELECT 
  id,
  license_file_url,
  registration_file_url 
FROM agents 
LIMIT 1;
```

If they look like: `agent-documents/123/file.jpg` → **CORRECT**
If they're full URLs already → Should work

**B) If signed URL fails:**
The API automatically falls back to public URLs. Check:
```sql
-- Make bucket public (while keeping RLS)
UPDATE storage.buckets SET public = true WHERE id = 'agent-documents';
```

**C) If images still don't load:**
Check storage policies:
```sql
-- Verify policies exist
SELECT name, definition 
FROM storage.policies 
WHERE bucket_id = 'agent-documents';
```

### API returns empty array
**Check:**
```javascript
// Browser console on /admin/agents page
// Should see: "Loaded agents: X"
```

**Debug:**
1. Go to `/test-agents-data`
2. Check "Agents with User Data" section
3. If shows data → API route issue
4. If empty → No agents in database

**Create test agent:**
1. Logout (if admin)
2. Go to `/agent/signup`
3. Fill form and submit
4. Login as admin again
5. Check dashboard

---

## Console Debugging

### Enable Debug Logs
Browser console should show:
```
Admin verification successful
Loaded agents: 3
Sample agent: {id: "...", business_name: "...", ...}
Fetching document: user-id/license.jpg
```

### Check API Responses
In browser DevTools → Network tab:
```
/api/admin/verify-admin → 200 {isAdmin: true}
/api/admin/agents/list → 200 {agents: [...]}
/api/admin/agents/get-document → 200 {signedUrl: "https://..."}
```

### Common Errors
```
403 Forbidden → Not admin, run 007_setup_admin.sql
500 Internal Server Error → Check API logs, database connection
404 Not Found → Wrong route/API path
```

---

## Data Verification Queries

### Check agents table
```sql
SELECT 
  id,
  business_name,
  verification_status,
  license_file_url,
  registration_file_url,
  verification_submitted_at
FROM agents
ORDER BY verification_submitted_at DESC;
```

### Check agents with user data
```sql
SELECT 
  a.id,
  a.business_name,
  a.verification_status,
  u.email,
  u.full_name,
  u.phone
FROM agents a
JOIN users u ON u.id = a.user_id
ORDER BY a.created_at DESC;
```

### Check admin users
```sql
SELECT 
  id,
  email,
  full_name,
  role,
  user_type
FROM users 
WHERE role = 'admin';
```

### Check storage files
```sql
SELECT 
  name,
  bucket_id,
  created_at
FROM storage.objects
WHERE bucket_id = 'agent-documents'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Testing Checklist

Before going live:

### Setup Tests
- [ ] Run migration 006 successfully
- [ ] Run migration 007 with your email
- [ ] Test page shows you as admin
- [ ] Test page shows agent count > 0

### Dashboard Tests
- [ ] Can access /admin/agents
- [ ] Stats cards show correct numbers
- [ ] Agent list table displays data
- [ ] Filter buttons work (All, Pending, etc.)
- [ ] Can click eye icon to view details

### Document Tests
- [ ] Modal opens with agent details
- [ ] License image displays correctly
- [ ] Registration image displays correctly
- [ ] Images load within 3 seconds
- [ ] Error fallback shows if image fails

### Action Tests
- [ ] Can approve agent (status changes)
- [ ] Can reject agent with notes
- [ ] Success toast appears
- [ ] List refreshes after action
- [ ] Agent status updates in real-time

### Security Tests
- [ ] Logout and try accessing /admin/agents
- [ ] Should redirect to /dashboard
- [ ] Try calling API with non-admin clerkId
- [ ] Should return 403 Forbidden

---

## Performance Tips

### Optimize Image Loading
If images load slowly:

1. **Use thumbnails** for list view (future enhancement)
2. **Lazy load** modal images (already implemented)
3. **Cache signed URLs** (valid for 1 hour)

### Reduce API Calls
- Filter status locally before fetching (if < 100 agents)
- Implement pagination (if > 50 agents)
- Cache agent list for 30 seconds

---

## Next Steps

After verifying data loads:

1. ✅ Test with real agent signup
2. ✅ Approve/reject test agent
3. ✅ Check agent sees approved status
4. ✅ Test with multiple agents
5. ✅ Test all filter options
6. ✅ Deploy to production

---

## Support

If data still not loading:

1. Check `/test-agents-data` page first
2. Review browser console errors
3. Check Supabase logs in dashboard
4. Verify RLS policies are correct
5. Ensure migrations ran successfully

**Still stuck?**
- Check [ADMIN_SECURITY.md](ADMIN_SECURITY.md) for security setup
- Check [AGENT_TABLE_SETUP.md](AGENT_TABLE_SETUP.md) for database schema
- Run `test-security.sql` to verify all policies
