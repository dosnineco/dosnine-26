# 🚨 URGENT: Storage Bucket Setup Required

## Problem
The `agent-documents` storage bucket does NOT exist in your Supabase project. This is why uploads are failing.

## Solution: Create the Bucket in Supabase Dashboard

### Method 1: Using Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/etikxypnxjsonefwnzkr
   - Or click: Storage → Buckets

2. **Create New Bucket**
   - Click "New bucket" button
   - **Bucket name**: `agent-documents`
   - **Public bucket**: ❌ UNCHECKED (keep it private)
   - **File size limit**: `5242880` (5MB in bytes)
   - **Allowed MIME types**: 
     ```
     image/jpeg
     image/jpg
     image/png
     ```
   - Click "Create bucket"

3. **Set Up RLS Policies**
   - Go to Storage → agent-documents → Policies
   - Click "New Policy" and create these 3 policies:

#### Policy 1: Allow Upload
```sql
Policy Name: Users can upload verification documents
Allowed operation: INSERT
Target roles: authenticated
WITH CHECK expression:
bucket_id = 'agent-documents'
```

#### Policy 2: Admin View Only
```sql
Policy Name: Only admins can view verification documents
Allowed operation: SELECT
Target roles: authenticated
USING expression:
bucket_id = 'agent-documents' AND
EXISTS (
  SELECT 1 FROM public.users
  WHERE users.clerk_id = auth.uid()::text
  AND users.role = 'admin'
)
```

#### Policy 3: Admin Delete Only
```sql
Policy Name: Only admins can delete documents
Allowed operation: DELETE
Target roles: authenticated
USING expression:
bucket_id = 'agent-documents' AND
EXISTS (
  SELECT 1 FROM public.users
  WHERE users.clerk_id = auth.uid()::text
  AND users.role = 'admin'
)
```

### Method 2: Using SQL Editor

1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Paste this SQL:

```sql
-- Create agent-documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agent-documents', 
  'agent-documents', 
  false,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png'];

-- Create RLS policies
CREATE POLICY "Users can upload verification documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agent-documents');

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

4. Click "Run" to execute

## Verify Setup

After creating the bucket, run this test:

```bash
cd starter
node test-storage-bucket.js
```

You should see:
```
✅ agent-documents bucket exists
   - Public: false
   - Size limit: 5242880
   - Allowed types: image/jpeg, image/jpg, image/png
```

## Then Test Upload

1. Sign in to your app: http://localhost:3002
2. Go to: http://localhost:3002/agent/signup
3. Upload license and registration images
4. Check browser console for detailed logs
5. Submit the form

You should see console logs:
```
Starting document upload for user: user_xxxxx
License file: license.png image/png
Uploading license to: user_xxxxx_license_1234567890_abc123.png
License uploaded successfully
```

## Troubleshooting

### Still Getting Errors?

1. **Check bucket exists**:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'agent-documents';
   ```

2. **Check policies**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%agent%';
   ```

3. **Check browser console** for exact error message

4. **Verify user is authenticated** via Clerk before uploading

### Common Errors

- `Bucket not found` → Bucket doesn't exist, follow steps above
- `new row violates row-level security` → RLS policies not set up correctly
- `File size too large` → Bucket has 5MB limit, check file size
- `Invalid mime type` → Only JPG/PNG allowed

## Quick Verification Command

```bash
curl -X GET "https://etikxypnxjsonefwnzkr.supabase.co/storage/v1/bucket/agent-documents" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0aWt4eXBueGpzb25lZnduemtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4Nzk4ODUsImV4cCI6MjA3OTQ1NTg4NX0.3AGs-ZM_EBN3wVGyuHk2tXfhrB_F0a48SKRWhipxVZg"
```

Should return bucket details, not 404.

---

**After setup is complete**, the agent signup form will work correctly!
