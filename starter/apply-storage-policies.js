const { createClient } = require('@supabase/supabase-js');

// You need to get your SERVICE ROLE KEY from Supabase Dashboard
// Go to: Project Settings > API > service_role key (secret)
// Then run: SUPABASE_SERVICE_ROLE_KEY=your-key node apply-storage-policies.js

const supabaseUrl = 'https://etikxypnxjsonefwnzkr.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  // Supabase service role key not found - check environment
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
  // Applying storage policies
  
  const { data, error } = await supabase.rpc('exec_sql', { sql: policies });
  
  if (error) {
    // Error applying policies, trying direct approach
    
    // Try direct SQL query instead
    const { error: sqlError } = await supabase.from('storage.objects').select('*').limit(1);
    // Direct query error
    
    // Manual steps required for storage policies
  } else {
    // Storage policies applied successfully
  }
}

applyPolicies();
