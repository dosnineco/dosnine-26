import { getDbClient } from '@/lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDbClient();

    const { data: directData } = await db
      .from('site_settings')
      .select('request_cost')
      .single();

    if (directData?.request_cost) {
      return res.status(200).json({ success: true, requestCost: Number(directData.request_cost) });
    }

    const { data: kvData } = await db
      .from('site_settings')
      .select('key, value')
      .eq('key', 'request_cost')
      .single();

    const parsed = Number(kvData?.value?.amount ?? kvData?.value ?? 500);
    return res.status(200).json({ success: true, requestCost: Number.isNaN(parsed) ? 500 : parsed });
  } catch (error) {
    return res.status(200).json({ success: true, requestCost: 500 });
  }
}
