# Storage Bucket Setup for Payment Proofs (Simplified - No Service Role Key)

## 📦 What This Does

Creates a Supabase Storage bucket called `agent-documents` to store:
- Agent payment proofs (receipts/screenshots)
- Property boost payment proofs
- Agent license documents
- Business registration documents

## 🚀 Quick Setup (1 Minute!)

### Step 1: Run SQL Script

1. Go to Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/etikxypnxjsonefwnzkr/editor
   ```

2. Click **"New Query"**

3. Copy the contents of `create-agent-documents-bucket.sql` and paste it

4. Click **"Run"** or press `Ctrl+Enter`

5. You should see: "Success. No rows returned"

### Step 2: Restart Dev Server

```bash
yarn dev
```

### Step 3: Test Upload

Go to `/agent/payment` and try uploading a payment proof!

## ✨ What Changed (Simplified Approach)

**OLD METHOD** (Complex):
- Required service role key
- Server-side API endpoints
- Base64 encoding/decoding
- More code, more complexity

**NEW METHOD** (Simple):
- ✅ Uses anon key (already in .env)
- ✅ Direct client-side uploads
- ✅ No API endpoints needed
- ✅ Faster and more secure

## 📂 Folder Structure

```
agent-documents/
├── payment-proofs/           # Agent payment receipts
│   └── {agentId}_{timestamp}.jpg
└── boost-payment-proofs/     # Property boost receipts
    └── {propertyId}_{timestamp}.jpg
```

## 🔒 Security Policies

Simplified policies that work with anon key:

1. **Upload**: Any authenticated user can upload
2. **Read**: Public read access (for admins to view)
3. **Update**: Authenticated users can update
4. **Delete**: Authenticated users can delete

## ✅ How It Works

1. User logs in with Clerk → gets Supabase session
2. Browser uploads file directly to Supabase Storage
3. Supabase checks: "Is user authenticated?" → Yes → Allow upload
4. File stored, public URL generated
5. Payment status updated in database

No server-side processing needed!

## 🐛 Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY is not defined"
- Make sure you added the key to `.env.local`
- Restart your dev server: `yarn dev`

### Error: "Policy ... already exists"
- The policies are already created, you're good!
- Or drop the policies first:
  ```sql
  DROP POLICY IF EXISTS "Users can upload agent documents" ON storage.objects;
  DROP POLICY IF EXISTS "Public read access for agent documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their agent documents" ON storage.objects;
  DROP POLICY IF EXISTS "Service role has full access" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete agent documents" ON storage.objects;
  ```

### Error: "Bucket already exists"
- The bucket is already created, you're good!

### Upload fails with 403 error
- Check that the bucket is public: `public: true`
- Verify policies are created correctly
- Check browser console for detailed error

## 📖 API Usage

The APIs automatically upload to this bucket:

```javascript
// Agent payment proof
POST /api/agent/submit-payment-proof
- Uploads to: payment-proofs/{agentId}_{timestamp}.ext

// Boost payment proof  
POST /api/boost/submit-payment-proof
- Uploads to: boost-payment-proofs/{propertyId}_{timestamp}.ext
```

## 🔧 Manual Bucket Creation (Alternative)

If you prefer, you can create the bucket manually in the Supabase dashboard:

1. Go to Storage → Create Bucket
2. Name: `agent-documents`
3. Public: ✅ Enabled
4. Click Create

Then add the policies from the SQL file.
