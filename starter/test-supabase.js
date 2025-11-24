// Quick test script to verify Supabase connection and properties
// Run: node test-supabase.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://etikxypnxjsonefwnzkr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0aWt4eXBueGpzb25lZnduemtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4Nzk4ODUsImV4cCI6MjA3OTQ1NTg4NX0.3AGs-ZM_EBN3wVGyuHk2tXfhrB_F0a48SKRWhipxVZg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  try {
    // Test 1: Check all properties
    const { data: allProps, error: allError, count } = await supabase
      .from('properties')
      .select('*', { count: 'exact' });

    if (allError) {
      console.error('❌ Error fetching all properties:', allError);
    } else {
      console.log(`✅ Total properties in database: ${count}`);
      console.log(`   Fetched: ${allProps?.length || 0} properties\n`);
    }

    // Test 2: Check available properties
    const { data: availProps, error: availError } = await supabase
      .from('properties')
      .select('*')
      .eq('status', 'available');

    if (availError) {
      console.error('❌ Error fetching available properties:', availError);
    } else {
      console.log(`✅ Available properties: ${availProps?.length || 0}\n`);
      
      if (availProps && availProps.length > 0) {
        console.log('📋 Sample property:');
        const sample = availProps[0];
        console.log({
          id: sample.id,
          title: sample.title,
          status: sample.status,
          parish: sample.parish,
          price: sample.price,
          has_image_urls: !!sample.image_urls,
          image_urls_count: sample.image_urls?.length || 0,
          slug: sample.slug,
        });
      }
    }

    // Test 3: Check statuses
    const { data: statusData } = await supabase
      .from('properties')
      .select('status');
    
    if (statusData) {
      const statuses = {};
      statusData.forEach(p => {
        statuses[p.status] = (statuses[p.status] || 0) + 1;
      });
      console.log('\n📊 Properties by status:', statuses);
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testConnection();
