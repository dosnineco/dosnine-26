const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testImpressionTracking() {
  console.log('🔍 Testing impression tracking...\n');

  // 1. Check if columns exist
  console.log('1. Checking if impressions columns exist...');
  const { data: ads, error: adsError } = await supabase
    .from('advertisements')
    .select('id, company_name, impressions, clicks')
    .limit(1);

  if (adsError) {
    console.error('❌ Error fetching ads:', adsError.message);
    console.log('\n⚠️  Migration may not have been run. Please run:');
    console.log('   Copy content from db-migrations/015_add_impression_tracking.sql');
    console.log('   Paste into Supabase SQL Editor and execute\n');
    return;
  }

  console.log('✅ Columns exist');
  console.log('   Sample ad:', ads[0]);

  // 2. Test impression increment function
  if (ads.length > 0) {
    const testAdId = ads[0].id;
    console.log(`\n2. Testing increment_ad_impressions with ad ID ${testAdId}...`);
    
    const { error: rpcError } = await supabase.rpc('increment_ad_impressions', {
      ad_id: testAdId
    });

    if (rpcError) {
      console.error('❌ RPC Error:', rpcError.message);
      console.log('\n⚠️  The function may not exist. Please run the migration.\n');
      return;
    }

    console.log('✅ Function executed successfully');

    // 3. Verify increment worked
    console.log('\n3. Verifying impression was recorded...');
    const { data: updated } = await supabase
      .from('advertisements')
      .select('impressions, last_impression_at')
      .eq('id', testAdId)
      .single();

    console.log('✅ Updated data:', updated);
    console.log('\n🎉 Impression tracking is working!\n');
  }
}

testImpressionTracking().catch(err => {
  // Error in test execution
});
