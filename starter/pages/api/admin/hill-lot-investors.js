import { getDbClient, requireAdminUser } from '../../../lib/apiAuth';

/* ----------------------------------------------------------
 * Shared helpers
 * ---------------------------------------------------------- */
function computeTierFields(item) {
  const amountValue = Number(item.investment_amount || 0);

  const amountText = item.investment_amount
    ? `$${Number(item.investment_amount).toLocaleString()}`
    : item.stay_type || '—';

  const rateValue =
    amountValue >= 30000
      ? 0.04
      : amountValue >= 20000
      ? 0.0325
      : amountValue >= 10000
      ? 0.03
      : 0;

  const rateLabel =
    rateValue === 0.04
      ? '4%'
      : rateValue === 0.0325
      ? '3.25%'
      : rateValue === 0.03
      ? '3%'
      : '—';

  return {
    ...item,
    amount_value: amountValue,
    amount_label: amountText || '—',
    rate_value: rateValue,
    rate_label: rateLabel,
    projected_annual: amountValue * rateValue,
  };
}

function sanitizeString(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function sanitizeNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/* ----------------------------------------------------------
 * Handler
 * ---------------------------------------------------------- */
export default async function handler(req, res) {
  const resolved = await requireAdminUser(req, res);
  if (!resolved) return;

  let db;
  try {
    db = getDbClient();
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: 'Database unavailable' });
  }

  try {
    /* -------------------- LIST -------------------- */
    if (req.method === 'GET') {
      const { data, error } = await db
        .from('hill_lot_pre_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items = (data || []).map(computeTierFields);
      return res.status(200).json({ success: true, items });
    }

    /* -------------------- CREATE -------------------- */
    if (req.method === 'POST') {
      const body = req.body || {};
      const fullName = sanitizeString(body.full_name);

      if (!fullName) {
        return res
          .status(400)
          .json({ success: false, error: 'Full name is required' });
      }

      const email = sanitizeString(body.email);
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        return res
          .status(400)
          .json({ success: false, error: 'Enter a valid email address' });
      }

      const insertPayload = {
        full_name: fullName,
        email,
        phone: sanitizeString(body.phone),
        investment_amount: sanitizeNumber(body.investment_amount),
        stay_type: sanitizeString(body.stay_type),
      };

      const { data, error } = await db
        .from('hill_lot_pre_registrations')
        .insert([insertPayload])
        .select('*')
        .single();

      if (error) throw error;

      return res
        .status(201)
        .json({ success: true, item: computeTierFields(data) });
    }

    /* -------------------- UPDATE -------------------- */
    if (req.method === 'PATCH' || req.method === 'PUT') {
      const body = req.body || {};
      const id = body.id || req.query?.id;

      if (!id) {
        return res
          .status(400)
          .json({ success: false, error: 'Missing investor id' });
      }

      const updatePayload = {};

      if (body.full_name !== undefined) {
        const name = sanitizeString(body.full_name);
        if (!name) {
          return res
            .status(400)
            .json({ success: false, error: 'Full name cannot be empty' });
        }
        updatePayload.full_name = name;
      }

      if (body.email !== undefined) {
        const email = sanitizeString(body.email);
        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
          return res
            .status(400)
            .json({ success: false, error: 'Enter a valid email address' });
        }
        updatePayload.email = email;
      }

      if (body.phone !== undefined) {
        updatePayload.phone = sanitizeString(body.phone);
      }

      if (body.investment_amount !== undefined) {
        updatePayload.investment_amount = sanitizeNumber(body.investment_amount);
      }

      if (body.stay_type !== undefined) {
        updatePayload.stay_type = sanitizeString(body.stay_type);
      }

      if (!Object.keys(updatePayload).length) {
        return res
          .status(400)
          .json({ success: false, error: 'No fields to update' });
      }

      const { data, error } = await db
        .from('hill_lot_pre_registrations')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      return res
        .status(200)
        .json({ success: true, item: computeTierFields(data) });
    }

    /* -------------------- DELETE -------------------- */
    if (req.method === 'DELETE') {
      const id = req.body?.id || req.query?.id;

      if (!id) {
        return res
          .status(400)
          .json({ success: false, error: 'Missing investor id' });
      }

      const { error } = await db
        .from('hill_lot_pre_registrations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ success: true, id });
    }

    return res
      .status(405)
      .json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Request failed',
    });
  }
}