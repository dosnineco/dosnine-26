import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in environment');
}

const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Server configuration error: Service role key missing' });
  }

  try {
    const { fileName, fileData, contentType, userId } = req.body;

    if (!fileName || !fileData || !userId) {
      return res.status(400).json({ error: 'Missing required fields: fileName, fileData, userId' });
    }

    console.log('Uploading file:', fileName, 'for user:', userId);

    // Convert base64 to buffer
    const base64Data = fileData.split(',')[1] || fileData;
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to Supabase storage using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from('agent-documents')
      .upload(fileName, buffer, {
        contentType: contentType || 'image/png',
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: `Upload failed: ${error.message}` });
    }

    console.log('Upload successful:', data);
    return res.status(200).json({ 
      success: true, 
      path: fileName,
      data 
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message || 'Upload failed' });
  }
}
