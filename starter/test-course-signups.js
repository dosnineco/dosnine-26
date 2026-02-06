// Test script to validate SQL query for course_preorders
// Run with: node test-course-signups.js

const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const supabaseUrl = 'https://etikxypnxjsonefwnzkr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0aWt4eXBueGpzb25lZnduemtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4Nzk4ODUsImV4cCI6MjA3OTQ1NTg4NX0.3AGs-ZM_EBN3wVGyuHk2tXfhrB_F0a48SKRWhipxVZg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQueries() {
  console.log('🔍 Testing course_preorders queries...\n');
  console.log('Table: public.course_preorders');
  console.log('Columns: id, name, email, phone, price_choice, buy_now, discounted_amount, payment_confirmed, created_at');
  console.log('═══════════════════════════════════════════════════════\n');

  // Test 1: Check if table exists with specific columns
  console.log('📋 Test 1: Checking table structure...');
  try {
    const { data: schemaData, error: schemaError } = await supabase
      .from('course_preorders')
      .select('id, name, email, phone, price_choice, buy_now, discounted_amount, payment_confirmed, created_at')
      .limit(0);
    
    if (schemaError) {
      console.log('❌ Table access error:', schemaError.message);
      console.log('   Code:', schemaError.code);
      console.log('   Details:', schemaError.details);
      console.log('   Hint:', schemaError.hint);
    } else {
      console.log('✅ Table exists and is accessible\n');
    }
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }

  // Test 2: Count total rows
  console.log('📊 Test 2: Counting total signups...');
  try {
    const { count, error: countError } = await supabase
      .from('course_preorders')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('❌ Count error:', countError.message);
      console.log('   This suggests RLS (Row Level Security) is blocking the query');
      console.log('   Code:', countError.code);
    } else {
      console.log(`✅ Total signups in database: ${count}`);
      console.log(`   Expected: 2`);
      console.log(`   Match: ${count === 2 ? '✅ YES' : '❌ NO'}\n`);
    }
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }

  // Test 3: Fetch all data with specific columns
  console.log('📥 Test 3: Fetching all signup data...');
  try {
    const { data, error } = await supabase
      .from('course_preorders')
      .select('id, name, email, phone, price_choice, buy_now, discounted_amount, payment_confirmed, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log('❌ Fetch error:', error.message);
      console.log('   Code:', error.code);
      
      if (error.code === 'PGRST116' || error.message.includes('policy')) {
        console.log('\n⚠️  DIAGNOSIS: Row Level Security (RLS) is blocking access!');
        console.log('   Solution: Run the SQL fix in Supabase:');
        console.log('   → Open db-migrations/QUICK_FIX_course_preorders.sql');
        console.log('   → Or run db-migrations/024_fix_course_preorders_rls.sql\n');
      }
    } else {
      console.log(`✅ Successfully fetched ${data?.length || 0} signups\n`);
      
      if (data && data.length > 0) {
        console.log('📋 Signup Details:');
        console.log('═══════════════════════════════════════════════════════');
        data.forEach((signup, index) => {
          console.log(`\n${index + 1}. ${signup.name}`);
          console.log(`   Email: ${signup.email}`);
          console.log(`   Phone: ${signup.phone || 'N/A'}`);
          console.log(`   Amount: JMD ${(signup.discounted_amount || 0).toLocaleString()}`);
          console.log(`   Price Choice: ${signup.price_choice || 'N/A'}`);
          console.log(`   Buy Now: ${signup.buy_now ? 'Yes' : 'No'}`);
          console.log(`   Payment Confirmed: ${signup.payment_confirmed ? '✅ Yes' : '❌ No'}`);
          console.log(`   Signed up: ${new Date(signup.created_at).toLocaleString()}`);
        });
        console.log('\n═══════════════════════════════════════════════════════');
      } else {
        console.log('⚠️  No data returned - possible RLS issue');
      }
    }
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }

  // Test 4: Check RLS policies
  console.log('\n🔒 Test 4: Checking RLS policies...');
  try {
    const { data: policies, error: policyError } = await supabase
      .rpc('pg_policies')
      .select('*')
      .eq('tablename', 'course_preorders');
    
    if (policyError) {
      console.log('ℹ️  Cannot check policies directly (requires elevated permissions)');
    } else if (policies) {
      console.log(`✅ Found ${policies.length} policies on course_preorders`);
    }
  } catch (err) {
    console.log('ℹ️  Policy check not available with current permissions');
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🏁 Tests completed!');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Run tests
testQueries().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
