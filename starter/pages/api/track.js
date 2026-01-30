// Analytics tracking endpoint
// Receives click/impression data and stores it in the database

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;

    // Validate required fields
    if (!data || !data.event_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Log the analytics data (you can store in database later)
    console.log('Analytics tracked:', {
      event: data.event_type,
      page: data.page_url,
      timestamp: data.created_at
    });

    // Return success
    return res.status(200).json({ 
      success: true,
      message: 'Analytics tracked successfully'
    });

  } catch (error) {
    console.error('Error tracking analytics:', error);
    return res.status(500).json({ 
      error: 'Failed to track analytics',
      message: error.message 
    });
  }
}
