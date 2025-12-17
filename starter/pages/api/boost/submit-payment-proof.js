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

    const { proofFile, fileName, amount, paymentType, propertyId, propertySlug } = req.body;

    if (!proofFile || !fileName || !amount || !propertyId) {
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

    // Verify property exists and belongs to user
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('owner_id', user.id)
      .single();

    if (propertyError || !property) {
      return res.status(403).json({ message: 'Property not found or unauthorized' });
    }

    // Convert base64 to buffer
    const base64Data = proofFile.replace(/^data:.*,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Get file extension
    const ext = fileName.split('.').pop();
    const timestamp = Date.now();
    const filePath = `boost-payment-proofs/${propertyId}_${timestamp}.${ext}`;

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

    // Create pending boost record
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 10); // 10 days boost

    const { error: boostError } = await supabase
      .from('property_boosts')
      .insert({
        property_id: propertyId,
        owner_id: user.id,
        payment_id: `pending_${timestamp}`,
        amount: amount,
        currency: 'JMD',
        boost_start_date: null, // Will be set when approved
        boost_end_date: null,
        status: 'pending_payment', // New status for pending verification
        payment_proof_url: urlData.publicUrl,
        payment_submitted_at: now.toISOString()
      });

    if (boostError) {
      console.error('Boost creation error:', boostError);
      return res.status(500).json({ message: 'Failed to create boost record', error: boostError.message });
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
