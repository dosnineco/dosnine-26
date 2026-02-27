import { getDbClient, requireAdminUser } from '../../../../lib/apiAuth';

// Get signed URL for viewing agent verification document
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { path } = req.query;

  if (!path) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const db = getDbClient();

    // Clean the path - remove bucket name if included
    let cleanPath = path;
    if (cleanPath.includes('agent-documents/')) {
      cleanPath = cleanPath.split('agent-documents/').pop();
    }
    // Remove query parameters if any
    cleanPath = cleanPath.split('?')[0];

    console.log('Fetching document:', cleanPath);

    // Generate signed URL valid for 1 hour
    const { data, error } = await db.storage
      .from('agent-documents')
      .createSignedUrl(cleanPath, 3600); // 1 hour

    if (error) {
      console.error('Failed to create signed URL:', error);
      // Try public URL as fallback
      const { data: publicData } = db.storage
        .from('agent-documents')
        .getPublicUrl(cleanPath);
      
      if (publicData?.publicUrl) {
        return res.status(200).json({ 
          signedUrl: publicData.publicUrl,
          expiresIn: 3600,
          fallback: true
        });
      }
      
      return res.status(500).json({ error: 'Failed to generate document URL' });
    }

    return res.status(200).json({ 
      signedUrl: data.signedUrl,
      expiresIn: 3600 
    });

  } catch (error) {
    console.error('Document URL error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
