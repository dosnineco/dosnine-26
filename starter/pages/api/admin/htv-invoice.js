import { getDbClient, requireAdminUser } from '@/lib/apiAuth';

export default async function handler(req, res) {
  const admin = await requireAdminUser(req, res);
  if (!admin) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, format = 'json' } = req.query;

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    const db = getDbClient();

    const { data: order, error } = await db
      .from('htv_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // If requesting JSON, return order data for client-side PDF generation
    if (format === 'json') {
      return res.status(200).json({
        success: true,
        order: {
          id: order.id,
          business_name: order.business_name,
          email: order.email,
          phone: order.phone,
          size: order.size,
          color: order.color,
          quantity: order.quantity,
          rush_order: order.rush_order,
          subtotal: Number(order.subtotal),
          delivery_fee: Number(order.delivery_fee),
          total: Number(order.total),
          expenses: Number(order.expenses),
          raw_materials: order.raw_materials || [],
          notes: order.notes,
          created_at: order.created_at,
          status: order.status,
        },
      });
    }

    return res.status(400).json({ error: 'Invalid format specified' });
  } catch (error) {
    console.error('Invoice generation error:', error);
    return res.status(500).json({ error: 'Failed to generate invoice' });
  }
}
