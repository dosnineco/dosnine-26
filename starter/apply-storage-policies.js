const { createClient } = require('@supabase/supabase-js');

// You need to get your SERVICE ROLE KEY from Supabase Dashboard
// Go to: Project Settings > API > service_role key (secret)
// Then run: SUPABASE_SERVICE_ROLE_KEY=your-key node apply-storage-policies.js

const supabaseUrl = 'https://etikxypnxjsonefwnzkr.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('\n❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not found!');
  console.error('\nTo fix this:');
  console.error('1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/etikxypnxjsonefwnzkr/settings/api');
  console.error('2. Copy the "service_role" key (NOT the anon key)');
  console.error('3. Run: SUPABASE_SERVICE_ROLE_KEY=your-key-here node apply-storage-policies.js\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const policies = `
-- Allow authenticated uploads to property-images bucket
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads to property-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-images');

-- Allow public reads from property-images
CREATE POLICY IF NOT EXISTS "Allow public reads from property-images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'property-images');

-- Allow authenticated updates to property-images
CREATE POLICY IF NOT EXISTS "Allow authenticated updates to property-images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'property-images')
WITH CHECK (bucket_id = 'property-images');

-- Allow authenticated deletes from property-images
CREATE POLICY IF NOT EXISTS "Allow authenticated deletes from property-images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'property-images');
`;

async function applyPolicies() {
  console.log('🔧 Applying storage policies...\n');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql: policies });
  
  if (error) {
    console.error('❌ Error applying policies:', error.message);
    console.log('\n⚠️  Trying direct approach...\n');
    
    // Try direct SQL query instead
    const { error: sqlError } = await supabase.from('storage.objects').select('*').limit(1);
    console.error('Direct query result:', sqlError);
    
    console.log('\n📋 MANUAL STEPS REQUIRED:');
    console.log('Since automated application failed, please:');
    console.log('1. Go to: https://supabase.com/dashboard/project/etikxypnxjsonefwnzkr/editor');
    console.log('2. Click "New Query"');
    console.log('3. Paste the contents of storage-policy.sql');
    console.log('4. Click "Run"\n');
  } else {
    console.log('✅ Storage policies applied successfully!');
    console.log('You can now upload images.\n');
  }
}

applyPolicies();
