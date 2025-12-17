import { createClient } from '@supabase/supabase-js';
import { getAuth } from '@clerk/nextjs/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { proofFile, fileName, amount, paymentType } = req.body;

    if (!proofFile || !fileName || !amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get user from clerk_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get agent from user_id
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Verify agent is approved
    if (agent.verification_status !== 'approved') {
      return res.status(403).json({ message: 'Agent not approved' });
    }

    // Convert base64 to buffer
    const base64Data = proofFile.replace(/^data:.*,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Get file extension
    const ext = fileName.split('.').pop();
    const timestamp = Date.now();
    const filePath = `payment-proofs/${agent.id}_${timestamp}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('agent-documents')
      .upload(filePath, buffer, {
        contentType: getContentType(ext),
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ message: 'Failed to upload file', error: uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('agent-documents')
      .getPublicUrl(filePath);

    // Update agent record - automatically set to 'paid' when proof is submitted
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        payment_status: 'paid',
        payment_proof_url: urlData.publicUrl,
        payment_date: new Date().toISOString()
      })
      .eq('id', agent.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json({ message: 'Failed to update agent', error: updateError.message });
    }

    // TODO: Send email notification to admin
    // You can add email notification here using your preferred email service

    res.status(200).json({
      success: true,
      message: 'Payment proof submitted successfully',
      proofUrl: urlData.publicUrl
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

function getContentType(ext) {
  const types = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'pdf': 'application/pdf'
  };
  return types[ext.toLowerCase()] || 'application/octet-stream';
}
