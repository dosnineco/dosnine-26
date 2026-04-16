import { getDbClient, requireAdminUser } from '@/lib/apiAuth';

function toApiError(defaultMessage, error) {
  if (!error) return defaultMessage;
  return error.message || error.details || error.hint || defaultMessage;
}

export default async function handler(req, res) {
  const admin = await requireAdminUser(req, res);
  if (!admin) return;

  const db = getDbClient();

  if (req.method === 'GET') {
    try {
      const { data, error } = await db
        .from('htv_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: toApiError('Failed to load HTV orders', error) });
      }

      return res.status(200).json({ success: true, orders: data || [] });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const payload = req.body || {};

      const subtotal = Number(payload.subtotal || 0);
      const delivery_fee = Number(payload.delivery_fee || 0);
      const total = Number(payload.total ?? subtotal + delivery_fee);
      const raw_material_cost = Number(payload.raw_material_cost || 0);
      const labor_cost = Number(payload.labor_cost || 0);
      const other_expenses = Number(payload.other_expenses || 0);
      const revenue = Number(payload.revenue ?? total);
      const expenses = Number(payload.expenses ?? raw_material_cost + labor_cost + other_expenses);
      const profit = Number(payload.profit ?? revenue - expenses);

      const raw_materials = Array.isArray(payload.raw_materials)
        ? payload.raw_materials.map((item) => ({
            material: String(item.material || item.name || ''),
            cost: Number(item.cost || item.price || 0),
            quantity: item.quantity ? Number(item.quantity) : undefined,
          }))
        : [];

      const result = await db
        .from('htv_orders')
        .insert([
          {
            business_name: String(payload.business_name || payload.business || ''),
            phone: String(payload.phone || ''),
            email: payload.email || null,
            size: String(payload.size || 'medium'),
            color: String(payload.color || 'black'),
            quantity: Number(payload.quantity || 1),
            delivery_area: String(payload.delivery_area || payload.deliveryArea || 'halfWayTree'),
            rush_order: Boolean(payload.rush_order ?? payload.rush ?? false),
            logo_url: String(payload.logo_url || payload.logoUrl || 'manual-entry'),
            logo_filename: String(payload.logo_filename || payload.logoFilename || 'manual-entry'),
            subtotal,
            delivery_fee,
            total,
            status: String(payload.status || 'pending'),
            notes: payload.notes || null,
            raw_materials,
            raw_material_cost,
            labor_cost,
            other_expenses,
            revenue,
            expenses,
            profit,
          },
        ])
        .select('*')
        .single();

      if (result.error) {
        return res.status(500).json({ error: toApiError('Failed to create HTV order', result.error) });
      }

      return res.status(200).json({ success: true, order: result.data });
    } catch (error) {
      console.error('HTV order create error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
