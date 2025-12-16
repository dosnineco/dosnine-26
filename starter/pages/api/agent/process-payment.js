import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clerkId, transactionId, amount } = req.body;

    if (!clerkId || !transactionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user from clerk_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update agent payment status
    const { data: agent, error: updateError } = await supabase
      .from('agents')
      .update({
        payment_status: 'paid',
        payment_amount: amount || 50.00,
        payment_date: new Date().toISOString(),
        paypal_transaction_id: transactionId,
      })
      .eq('user_id', userData.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update payment status:', updateError);
      return res.status(500).json({ error: 'Failed to update payment status' });
    }

    return res.status(200).json({ 
      success: true, 
      agent,
      message: 'Payment processed successfully' 
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
