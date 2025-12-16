import { supabase } from '@/lib/supabase';

// Create service request
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    clerkId,
    clientName,
    clientEmail,
    clientPhone,
    requestType,
    propertyType,
    location,
    budgetMin,
    budgetMax,
    bedrooms,
    bathrooms,
    description,
    urgency,
  } = req.body;

  if (!clientName || !clientEmail || !clientPhone || !requestType || !propertyType || !location) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Get user ID if clerk ID provided
    let clientUserId = null;
    if (clerkId) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkId)
        .single();
      clientUserId = user?.id;
    }

    // Create service request
    const { data, error } = await supabase
      .from('service_requests')
      .insert([{
        client_user_id: clientUserId,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        request_type: requestType,
        property_type: propertyType,
        location: location,
        budget_min: budgetMin,
        budget_max: budgetMax,
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        description: description,
        urgency: urgency || 'normal',
        status: 'open',
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ 
        error: 'Failed to create service request',
        details: error.message || 'Unknown error'
      });
    }

    // Automatically assign to a paid agent using fair distribution
    try {
      await fetch(`${req.headers.origin || 'http://localhost:3002'}/api/service-requests/auto-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: data.id })
      });
    } catch (assignError) {
      // Don't fail request creation if auto-assignment fails
      // Request will remain 'open' and can be manually assigned
    }

    return res.status(200).json({ 
      success: true,
      request: data,
      message: 'Service request submitted successfully'
    });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
