import { supabase } from '@/lib/supabase';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { file, filename } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!filename) {
      return res.status(400).json({ error: 'No filename provided' });
    }

    console.log('Upload request received for:', filename);

    // Extract base64 data and detect MIME type
    const base64Data = file.split(',')[1] || file;
    const mimeMatch = file.match(/^data:([^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    
    const binaryString = Buffer.from(base64Data, 'base64');
    console.log('File size:', binaryString.length, 'bytes');

    // Generate unique filename to avoid collisions
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = filename.split('.').pop() || 'png';
    const uniqueFilename = `${timestamp}-${randomStr}-${filename.replace(/\.[^/.]+$/, '')}.${ext}`;

    console.log('Uploading as:', uniqueFilename);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('htv-logos')
      .upload(uniqueFilename, binaryString, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ error: error.message || 'Failed to upload logo' });
    }

    console.log('Upload successful, generating public URL...');

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('htv-logos')
      .getPublicUrl(uniqueFilename);

    const logoUrl = publicUrlData?.publicUrl;

    if (!logoUrl) {
      console.error('Failed to generate public URL');
      return res.status(500).json({ error: 'Failed to get public URL' });
    }

    console.log('Public URL:', logoUrl);

    return res.status(200).json({
      success: true,
      logoUrl,
      filename: uniqueFilename,
    });
  } catch (error) {
    console.error('Upload handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
