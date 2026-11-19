import adminHtvOrdersHandler from '../admin/htv-orders';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  return adminHtvOrdersHandler(req, res);
}
