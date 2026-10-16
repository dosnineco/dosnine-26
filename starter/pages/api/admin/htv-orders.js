import { getDbClient, requireAdminUser } from '@/lib/apiAuth';
import * as SibApiV3Sdk from '@getbrevo/brevo';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

// Input validation and sanitization
function sanitizeString(input, maxLength = 255) {
  if (typeof input !== 'string') return '';
  return input.trim().substring(0, maxLength).replace(/[<>]/g, '');
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && email.length <= 254 && emailRegex.test(email);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

function validatePhone(phone) {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return typeof phone === 'string' && phoneRegex.test(phone) && phone.length >= 7 && phone.length <= 30;
}

function toApiError(defaultMessage, error) {
  if (!error) return defaultMessage;
  return error.message || error.details || error.hint || defaultMessage;
}

export default async function handler(req, res) {
  let db;

  try {
    db = getDbClient();
  } catch (error) {
    console.error('HTV orders handler init failed', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'HTV order service unavailable',
    });
  }

  // Allow public POST (order submissions), but require admin for GET/PUT/DELETE
  if (req.method === 'GET' || req.method === 'PUT' || req.method === 'DELETE') {
    const admin = await requireAdminUser(req, res);
    if (!admin) return;
  }

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

      // Validate required fields
      const businessName = sanitizeString(payload.business_name || '', 100);
      const phone = sanitizeString(payload.phone || '', 30);
      const email = sanitizeString(payload.email || '', 254).toLowerCase();
      const location = sanitizeString(payload.location || '', 100);

      if (!businessName || businessName.length < 2) {
        return res.status(400).json({ error: 'Business name must be at least 2 characters' });
      }

      if (!validatePhone(phone)) {
        return res.status(400).json({ error: 'Invalid phone number' });
      }

      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      const subtotal = Number(payload.subtotal || 0);
      const delivery_fee = Number(payload.delivery_fee || 0);
      const raw_material_cost = Number(payload.raw_material_cost || 0);
      const labor_cost = Number(payload.labor_cost || 0);
      const other_expenses = Number(payload.other_expenses || 0);
      const baseTotal = subtotal + delivery_fee + raw_material_cost + labor_cost;
      const explicitTotal = Number(payload.total || 0);
      const total = explicitTotal > 0 ? (explicitTotal > baseTotal ? explicitTotal : explicitTotal + Math.round(explicitTotal * 0.15)) : baseTotal + Math.round(baseTotal * 0.15);
      const revenue = Number(payload.revenue ?? total);
      const expenses = Number(payload.expenses ?? raw_material_cost + labor_cost + other_expenses);
      const profit = Number(payload.profit ?? revenue - expenses);

      const raw_materials = Array.isArray(payload.raw_materials)
        ? payload.raw_materials.map((item) => ({
            material: String(item.material || item.name || '').substring(0, 100),
            cost: Number(item.cost || item.price || 0),
            quantity: item.quantity ? Number(item.quantity) : undefined,
          }))
        : [];

      // Calculate order month and week
      const now = new Date();
      const orderMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const orderWeek = new Date(now);
      orderWeek.setDate(orderWeek.getDate() - orderWeek.getDay()); // Start of week (Sunday)

      const result = await db
        .from('htv_orders')
        .insert([
          {
            business_name: businessName,
            phone: phone,
            email: email,
            size: String(payload.size || 'medium').substring(0, 50),
            color: String(payload.color || 'black').substring(0, 50),
            quantity: Number(payload.quantity || 1),
            delivery_area: location || 'Not provided',
            rush_order: Boolean(payload.rush_order ?? payload.rush ?? false),
            logo_url: String(payload.logo_url || payload.logoUrl || 'manual-entry').substring(0, 500),
            logo_filename: String(payload.logo_filename || payload.logoFilename || 'manual-entry').substring(0, 255),
            subtotal,
            delivery_fee,
            total,
            status: String(payload.status || 'pending').substring(0, 50),
            notes: payload.notes ? sanitizeString(payload.notes, 1000) : null,
            raw_materials,
            raw_material_cost,
            labor_cost,
            other_expenses,
            revenue,
            expenses,
            profit,
            order_month: orderMonth.toISOString().split('T')[0],
            order_week: orderWeek.toISOString().split('T')[0],
          },
        ])
        .select('*')
        .single();

      if (result.error) {
        return res.status(500).json({ error: toApiError('Failed to create HTV order', result.error) });
      }

      let clientEmailSent = false;
      let adminEmailSent = false;
      const apiKey = process.env.BREVO_API_KEY;

      if (!apiKey) {
        console.error('HTV order emails were not sent: BREVO_API_KEY is not configured');
      } else {
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, apiKey);
        const sender = {
          name: process.env.BREVO_FROM_NAME || 'Dosnine Limited ',
          email: process.env.BREVO_FROM_EMAIL || 'admin@dosnine.com',
        };
        const safeName = escapeHtml(businessName);
        const safeEmail = escapeHtml(email);
        const safePhone = escapeHtml(phone);
        const safeLocation = escapeHtml(location || 'Not provided');
        const safeSize = escapeHtml(payload.size || 'Not specified');
        const safeColor = escapeHtml(payload.color || 'Not specified');
        const safeQuantity = escapeHtml(payload.quantity || 1);
        const safeTotal = Number.isFinite(total) ? total.toLocaleString() : '0';

        try {
          const clientEmail = new SibApiV3Sdk.SendSmtpEmail();
          clientEmail.sender = sender;
          clientEmail.to = [{ email, name: businessName }];
          clientEmail.subject = 'We received your Dosnine logo order';
          clientEmail.htmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
              <h2>Logo order received</h2>
              <p>Hi ${safeName},</p>
              <p>Thank you for placing your logo cutting order. We have received it and will contact you to confirm the next steps.</p>
              <p><strong>Order:</strong> ${safeQuantity} ${safeSize} logos, ${safeColor}</p>
              <p><strong>Total:</strong> JMD ${safeTotal}</p>
              <p><strong>Pickup location:</strong> ${safeLocation}</p>
              <p>Please send your payment proof on WhatsApp so we can begin processing your order.</p>
              <p>Thank you,<br />The Dosnine Team</p>
            </div>
          `;
          clientEmail.textContent = `Hi ${businessName},\n\nThank you for placing your logo cutting order. We have received it and will contact you to confirm the next steps.\n\nOrder: ${payload.quantity || 1} ${payload.size || 'Not specified'} logos, ${payload.color || 'Not specified'}\nTotal: JMD ${safeTotal}\nPickup location: ${location || 'Not provided'}\n\nPlease send your payment proof on WhatsApp so we can begin processing your order.\n\nThank you,\nThe Dosnine Team`;
          await apiInstance.sendTransacEmail(clientEmail);
          clientEmailSent = true;
        } catch (emailError) {
          console.error('HTV client confirmation email failed:', emailError?.response?.body || emailError?.message);
        }

        try {
          const adminEmail = new SibApiV3Sdk.SendSmtpEmail();
          adminEmail.sender = sender;
          adminEmail.to = [{
            email: process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'admin@dosnine.com',
            name: 'Dosnine Admin',
          }];
          adminEmail.replyTo = { email, name: businessName };
          adminEmail.subject = 'New logo cutting order received';
          adminEmail.htmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
              <h2>New logo cutting order</h2>
              <p><strong>Customer:</strong> ${safeName}</p>
              <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
              <p><strong>Phone:</strong> ${safePhone}</p>
              <p><strong>Quantity:</strong> ${safeQuantity}</p>
              <p><strong>Size:</strong> ${safeSize}</p>
              <p><strong>Color:</strong> ${safeColor}</p>
              <p><strong>Pickup location:</strong> ${safeLocation}</p>
              <p><strong>Total:</strong> JMD ${safeTotal}</p>
              <p><strong>Order ID:</strong> ${escapeHtml(result.data?.id)}</p>
            </div>
          `;
          adminEmail.textContent = `New logo cutting order\n\nCustomer: ${businessName}\nEmail: ${email}\nPhone: ${phone}\nQuantity: ${payload.quantity || 1}\nSize: ${payload.size || 'Not specified'}\nColor: ${payload.color || 'Not specified'}\nPickup location: ${location || 'Not provided'}\nTotal: JMD ${safeTotal}\nOrder ID: ${result.data?.id || 'Unavailable'}`;
          await apiInstance.sendTransacEmail(adminEmail);
          adminEmailSent = true;
        } catch (emailError) {
          console.error('HTV admin notification email failed:', emailError?.response?.body || emailError?.message);
        }
      }

      return res.status(200).json({
        success: true,
        order: result.data,
        clientEmailSent,
        adminEmailSent,
      });
    } catch (error) {
      console.error('HTV order create error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Order ID is required' });
      }

      const payload = req.body || {};

      const subtotal = Number(payload.subtotal || 0);
      const delivery_fee = Number(payload.delivery_fee || 0);
      const raw_material_cost = Number(payload.raw_material_cost || 0);
      const labor_cost = Number(payload.labor_cost || 0);
      const other_expenses = Number(payload.other_expenses || 0);
      const baseTotal = subtotal + delivery_fee + raw_material_cost + labor_cost;
      const explicitTotal = Number(payload.total || 0);
      const total = explicitTotal > 0 ? (explicitTotal > baseTotal ? explicitTotal : explicitTotal + Math.round(explicitTotal * 0.15)) : baseTotal + Math.round(baseTotal * 0.15);
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

      // Calculate order month and week
      const now = new Date();
      const orderMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const orderWeek = new Date(now);
      orderWeek.setDate(orderWeek.getDate() - orderWeek.getDay()); // Start of week (Sunday)

      const result = await db
        .from('htv_orders')
        .update({
          business_name: String(payload.business_name || ''),
          phone: String(payload.phone || ''),
          email: payload.email || null,
          size: String(payload.size || 'medium'),
          color: String(payload.color || 'black'),
          quantity: Number(payload.quantity || 1),
          delivery_area: String(payload.delivery_area || 'halfWayTree'),
          rush_order: Boolean(payload.rush_order ?? false),
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
          order_month: orderMonth.toISOString().split('T')[0],
          order_week: orderWeek.toISOString().split('T')[0],
        })
        .eq('id', id)
        .select('*')
        .single();

      if (result.error) {
        return res.status(500).json({ error: toApiError('Failed to update HTV order', result.error) });
      }

      return res.status(200).json({ success: true, order: result.data });
    } catch (error) {
      console.error('HTV order update error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Order ID is required' });
      }

      const result = await db
        .from('htv_orders')
        .delete()
        .eq('id', id);

      if (result.error) {
        return res.status(500).json({ error: toApiError('Failed to delete HTV order', result.error) });
      }

      return res.status(200).json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
      console.error('HTV order delete error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
