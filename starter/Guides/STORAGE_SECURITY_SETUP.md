# Supabase Storage Security Setup for Agent Verification

## Overview
Agent verification documents (licenses and IDs) are stored in the `agent-documents` bucket with **ADMIN-ONLY** access for security during the verification process.

## Storage Bucket Configuration

### Bucket Name
`agent-documents`

### Security Settings
- **Public Access**: `false` (Private bucket)
- **Upload**: Any authenticated user can upload during registration
- **View/Download**: **ONLY ADMINS** can view verification documents
- **Delete**: **ONLY ADMINS** can delete documents

## Row Level Security (RLS) Policies

### Policy 1: Upload Documents
```sql
CREATE POLICY "Users can upload verification documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agent-documents');
```
- Allows authenticated users to upload during agent registration
- No folder restrictions - simplified for reliability

### Policy 2: View Documents (ADMIN ONLY)
```sql
CREATE POLICY "Only admins can view verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'agent-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.clerk_id = auth.uid()::text
    AND users.role = 'admin'
  )
);
```
- **CRITICAL**: Only users with `role = 'admin'` in the `users` table can view documents
- Prevents agents from viewing other agents' documents
- Ensures privacy during verification

### Policy 3: Delete Documents (ADMIN ONLY)
```sql
CREATE POLICY "Only admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'agent-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.clerk_id = auth.uid()::text
    AND users.role = 'admin'
  )
);
```

## Database Schema Updates

### Users Table Columns
```sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS agent_license_file_url TEXT,
ADD COLUMN IF NOT EXISTS agent_registration_file_url TEXT;
```

**Stored Values**: File paths (e.g., `user123_license_1234567890_license.png`)
**NOT URLs**: Just the file name/path, not full URLs

## Setup Instructions

### 1. Run Migration
```bash
# Execute the SQL migration in Supabase SQL Editor
cat db-migrations/003_create_storage_bucket.sql
```

### 2. Set Admin User
```sql
-- Update your admin user email
UPDATE public.users
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

### 3. Verify Policies
Go to Supabase Dashboard → Storage → agent-documents → Policies
Confirm 3 policies are active:
- ✅ Users can upload verification documents
- ✅ Only admins can view verification documents  
- ✅ Only admins can delete documents

## File Upload Flow

### Agent Registration Process
1. **Agent submits form** with license and ID images (JPG/PNG only)
2. **Files uploaded** to `agent-documents` bucket via client-side Supabase client
3. **File paths stored** in `users` table columns:
   - `agent_license_file_url`
   - `agent_registration_file_url`
4. **Agent status** set to `agent_verification_status = 'pending'`

### Admin Approval Process
1. **Admin logs in** (must have `role = 'admin'`)
2. **Views pending agents** at `/admin/agent-approvals`
3. **Clicks "View License"** or "View Registration"
4. **System generates signed URL** (1-hour expiry) using admin credentials
5. **Document opens** in new tab for review
6. **Admin approves/rejects** agent application

## Security Benefits

### ✅ Privacy Protection
- Agents cannot view other agents' verification documents
- Regular users cannot access any verification documents
- Only authorized admins can review during approval

### ✅ Data Confidentiality
- Government IDs and licenses are sensitive documents
- Private bucket prevents accidental public exposure
- Signed URLs expire after 1 hour for temporary access

### ✅ Audit Trail
- All document access is logged by Supabase
- Admin actions are trackable
- File paths stored in database for reference

## API Implementation

### Upload in AgentSignup Component
```javascript
const licenseFileName = `${user?.id}_license_${Date.now()}_${file.name}`;
const { data, error } = await supabase.storage
  .from('agent-documents')
  .upload(licenseFileName, file);

// Store just the file name/path
licenseFileUrl: licenseFileName
```

### View in Admin Dashboard
```javascript
const { data, error } = await supabase.storage
  .from('agent-documents')
  .createSignedUrl(filePath, 3600); // 1 hour

window.open(data.signedUrl, '_blank');
```

## Testing Checklist

- [ ] Non-admin users cannot view documents directly
- [ ] Agents can upload documents during registration
- [ ] Admin can view all pending agent documents
- [ ] Signed URLs work and expire after 1 hour
- [ ] File paths are stored correctly in users table
- [ ] Only JPG/PNG files are accepted (enforced client-side)

## Troubleshooting

### "Failed to load document" Error
1. Check if user has `role = 'admin'` in database
2. Verify RLS policies are enabled on storage.objects
3. Confirm file path exists in storage bucket
4. Check browser console for detailed error

### Upload Failures
1. Verify bucket name is exactly `agent-documents`
2. Check file size is under 5MB
3. Confirm file type is JPG or PNG
4. Ensure user is authenticated via Clerk

### Policy Not Working
1. Drop existing policies: `DROP POLICY IF EXISTS "policy_name" ON storage.objects;`
2. Re-run migration SQL
3. Refresh Supabase dashboard
4. Test with new upload

## Admin Setup Command

```sql
-- Run this to make yourself admin
UPDATE public.users 
SET role = 'admin' 
WHERE clerk_id = 'your_clerk_user_id' 
   OR email = 'your.email@example.com';

-- Verify admin status
SELECT id, full_name, email, role 
FROM public.users 
WHERE role = 'admin';
```

## Important Notes

⚠️ **File Type Restriction**: Only JPG and PNG accepted (no PDFs) for easier preview in admin dashboard

⚠️ **Government ID Option**: If agent doesn't have a business, they can upload a government-issued photo ID instead of business registration

⚠️ **Clerk Auth Integration**: RLS policies use `auth.uid()` which maps to `clerk_id` column in users table

⚠️ **Signed URL Expiry**: Admin document viewing URLs expire after 1 hour for security - admin must regenerate to view again
