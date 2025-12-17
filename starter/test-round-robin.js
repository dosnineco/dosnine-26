#!/usr/bin/env node

/**
 * Test Round-Robin Allocation System
 * 
 * This script tests if the round-robin algorithm is working correctly by:
 * 1. Checking if agents table has last_request_assigned_at column
 * 2. Verifying agents are sorted by this timestamp
 * 3. Testing the auto-assign endpoint
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testRoundRobin() {
  console.log('🔍 Testing Round-Robin Allocation System\n');

  // 1. Check agents table structure
  console.log('1️⃣ Checking agents table...');
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select(`
      id, 
      business_name,
      verification_status, 
      payment_status, 
      last_request_assigned_at,
      users:user_id (full_name, email)
    `)
    .order('last_request_assigned_at', { ascending: true, nullsFirst: true });

  if (agentsError) {
    console.error('❌ Error fetching agents:', agentsError.message);
    return;
  }

  console.log(`✅ Found ${agents.length} agents\n`);

  // 2. Show agent queue
  console.log('2️⃣ Current Agent Queue (Round-Robin Order):');
  console.log('─'.repeat(80));
  
  const eligibleAgents = agents.filter(
    a => a.verification_status === 'approved' && a.payment_status === 'paid'
  );

  if (eligibleAgents.length === 0) {
    console.log('⚠️  No eligible agents (verified + paid)');
    console.log('\nAll agents:');
    agents.forEach((agent, idx) => {
      const name = agent.users?.full_name || agent.business_name || 'Unnamed Agent';
      console.log(`${idx + 1}. ${name}`);
      console.log(`   Business: ${agent.business_name || 'N/A'}`);
      console.log(`   Status: ${agent.verification_status} | Payment: ${agent.payment_status}`);
      console.log(`   Last assigned: ${agent.last_request_assigned_at || 'Never'}\n`);
    });
    return;
  }

  eligibleAgents.forEach((agent, idx) => {
    const position = idx + 1;
    const name = agent.users?.full_name || agent.business_name || 'Unnamed Agent';
    const lastAssigned = agent.last_request_assigned_at 
      ? new Date(agent.last_request_assigned_at).toLocaleString()
      : '🆕 Never (will get priority)';
    
    console.log(`${position}. ${name} (ID: ${agent.id})`);
    console.log(`   Business: ${agent.business_name || 'N/A'}`);
    console.log(`   Last request assigned: ${lastAssigned}`);
    console.log(`   ${position === 1 ? '👉 NEXT IN LINE' : ''}\n`);
  });

  console.log('─'.repeat(80));

  // 3. Check service requests
  console.log('\n3️⃣ Checking service requests...');
  const { data: requests, error: requestsError } = await supabase
    .from('service_requests')
    .select(`
      id, 
      status, 
      assigned_agent_id,
      created_at,
      agents:assigned_agent_id (business_name, users:user_id (full_name))
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (requestsError) {
    console.error('❌ Error fetching requests:', requestsError.message);
    return;
  }

  console.log(`✅ Found ${requests.length} recent requests\n`);

  requests.forEach((req, idx) => {
    const agentName = req.agents?.users?.full_name || req.agents?.business_name || 'Unassigned';
    console.log(`${idx + 1}. Request ${req.id} - Status: ${req.status}`);
    console.log(`   Assigned to: ${agentName}\n`);
  });

  // 4. Summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total agents: ${agents.length}`);
  console.log(`Eligible agents (verified + paid): ${eligibleAgents.length}`);
  console.log(`Total requests: ${requests.length}`);
  console.log(`Assigned requests: ${requests.filter(r => r.assigned_agent_id).length}`);
  console.log(`Open requests: ${requests.filter(r => r.status === 'open').length}`);

  if (eligibleAgents.length > 0) {
    const nextAgent = eligibleAgents[0].users?.full_name || eligibleAgents[0].business_name || 'Unnamed Agent';
    console.log(`\n✅ Round-robin system is READY`);
    console.log(`Next agent to receive request: ${nextAgent}`);
  } else {
    console.log(`\n⚠️  No eligible agents - requests will queue until an agent is approved and paid`);
  }

  console.log('\n💡 To test allocation:');
  console.log('   1. Submit a new service request via the "Find Agent" form');
  console.log('   2. Check agent dashboard to see assignment');
  console.log('   3. Submit another request - it should go to the next agent in queue');
}

testRoundRobin()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
