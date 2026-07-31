import { getDbClient, requireAdminUser } from '../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const resolved = await requireAdminUser(req, res);
  if (!resolved) return;

  try {
    const db = getDbClient();
    const { data, error } = await db
      .from('hill_lot_pre_registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const items = (data || []).map((item) => {
      const amountValue = Number(item.investment_amount || 0);
      const amountText = item.investment_amount ? `$${Number(item.investment_amount).toLocaleString()}` : item.stay_type || '—';
      const rateValue = amountValue >= 30000 ? 0.04 : amountValue >= 20000 ? 0.0325 : amountValue >= 10000 ? 0.03 : 0;
      const rateLabel = rateValue === 0.04 ? '4%' : rateValue === 0.0325 ? '3.25%' : rateValue === 0.03 ? '3%' : '—';

      return {
        ...item,
        amount_value: amountValue,
        amount_label: amountText || '—',
        rate_value: rateValue,
        rate_label: rateLabel,
        projected_annual: amountValue * rateValue,
      };
    });

    return res.status(200).json({ success: true, items });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to load investor data' });
  }
}
