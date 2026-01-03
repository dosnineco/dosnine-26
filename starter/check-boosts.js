const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBoosts() {
  // Checking for active boosts

  
  // Check if table exists and get all boosts
  const { data: allBoosts, error: allError } = await supabase
    .from('property_boosts')
    .select('*')
    .limit(5);
  
  if (allError) {
    // Error fetching boosts
    return;
  }
  
  // Total boosts in table

  if (allBoosts && allBoosts.length > 0) {
    console.log('All boosts:', JSON.stringify(allBoosts, null, 2));
  }
  
  // Check active boosts
  const { data: activeBoosts, error: activeError } = await supabase
    .from('property_boosts')
    .select(`
      *,
      properties (
        id,
        title,
        slug
      )
    `)
    .eq('status', 'active')
    .gte('boost_end_date', new Date().toISOString());
  
  if (activeError) {
    // Error fetching active boosts
    return;
  }
  
  // Active boosts count

  if (activeBoosts && activeBoosts.length > 0) {
    console.log('Active boosts:', JSON.stringify(activeBoosts, null, 2));
  } else {
    console.log('\n❌ No active boosts found!');
    console.log('This is why the banner is not showing.');
    console.log('\nTo fix:');
    console.log('1. Create a boost via the UI at /landlord/boost-property');
    console.log('2. Or run the SQL migration to insert test data');
  }
}

checkBoosts();
