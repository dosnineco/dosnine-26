import { supabase } from '@/lib/supabase';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

// Allowed MIME types for logo uploads
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateFileType(mimeType) {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

function sanitizeFilename(filename) {
  // Remove path traversal attempts and special characters
  return filename
    .replace(/\.\.\//g, '')
    .replace(/[^a-zA-Z0-9._\- ]/g, '')
    .substring(0, 255);
}

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

    // Validate filename
    const sanitizedFilename = sanitizeFilename(filename);
    if (!sanitizedFilename) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    console.log('Upload request received for:', sanitizedFilename);

    // Extract base64 data and detect MIME type
    const base64Data = file.split(',')[1] || file;
    const mimeMatch = file.match(/^data:([^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

    // Validate MIME type
    if (!validateFileType(mimeType)) {
      return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
    }

    const binaryString = Buffer.from(base64Data, 'base64');
    
    // Validate file size
    if (binaryString.length > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'File is too large. Maximum 10MB allowed.' });
    }

    console.log('File size:', binaryString.length, 'bytes');

    // Generate unique filename to avoid collisions
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = sanitizedFilename.split('.').pop() || 'png';
    const uniqueFilename = `${timestamp}-${randomStr}-${sanitizedFilename.replace(/\.[^/.]+$/, '')}.${ext}`;

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
