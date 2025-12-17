// Test script to verify Supabase Storage setup
// Run with: node test-storage-setup.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure these are set in .env.local:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testStorage() {
  console.log('🧪 Testing Supabase Storage Setup...\n');

  // Test 1: Check if bucket exists
  console.log('1️⃣  Checking if agent-documents bucket exists...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.error('❌ Failed to list buckets:', bucketsError.message);
    return false;
  }

  const agentDocsBucket = buckets.find(b => b.id === 'agent-documents');
  if (!agentDocsBucket) {
    console.error('❌ agent-documents bucket not found!');
    console.log('   Run the SQL script in create-agent-documents-bucket.sql');
    return false;
  }

  console.log('✅ agent-documents bucket exists');
  console.log(`   Public: ${agentDocsBucket.public ? 'Yes' : 'No'}`);
  console.log('');

  // Test 2: Test upload
  console.log('2️⃣  Testing file upload...');
  const testFileName = `payment-proofs/test_${Date.now()}.txt`;
  const testContent = 'This is a test upload';

  const { error: uploadError } = await supabase.storage
    .from('agent-documents')
    .upload(testFileName, testContent, {
      contentType: 'text/plain',
      upsert: false
    });

  if (uploadError) {
    console.error('❌ Upload failed:', uploadError.message);
    console.log('   Check that the storage policies are set up correctly');
    return false;
  }

  console.log('✅ Upload successful');
  console.log(`   File: ${testFileName}`);
  console.log('');

  // Test 3: Get public URL
  console.log('3️⃣  Testing public URL access...');
  const { data: urlData } = supabase.storage
    .from('agent-documents')
    .getPublicUrl(testFileName);

  console.log('✅ Public URL generated');
  console.log(`   URL: ${urlData.publicUrl}`);
  console.log('');

  // Test 4: List files
  console.log('4️⃣  Listing files in payment-proofs folder...');
  const { data: files, error: listError } = await supabase.storage
    .from('agent-documents')
    .list('payment-proofs');

  if (listError) {
    console.error('❌ List failed:', listError.message);
    return false;
  }

  console.log(`✅ Found ${files.length} file(s) in payment-proofs/`);
  console.log('');

  // Test 5: Delete test file
  console.log('5️⃣  Cleaning up test file...');
  const { error: deleteError } = await supabase.storage
    .from('agent-documents')
    .remove([testFileName]);

  if (deleteError) {
    console.error('⚠️  Could not delete test file:', deleteError.message);
    console.log('   You can manually delete it from the Supabase dashboard');
  } else {
    console.log('✅ Test file deleted');
  }

  console.log('');
  console.log('🎉 All tests passed! Storage is ready to use.');
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Try uploading a payment proof at /agent/payment');
  console.log('   2. Check the admin panel to verify payments');
  console.log('');

  return true;
}

testStorage()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
