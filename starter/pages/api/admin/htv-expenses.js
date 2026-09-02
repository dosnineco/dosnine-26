import { getDbClient, requireAdminUser } from '@/lib/apiAuth';

function sanitizeString(input, maxLength = 255) {
  if (typeof input !== 'string') return '';
  return input.trim().substring(0, maxLength).replace(/[<>]/g, '');
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
    console.error('HTV expenses handler init failed', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'HTV expense service unavailable',
    });
  }

  const admin = await requireAdminUser(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    try {
      const { data, error } = await db
        .from('htv_expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (error) {
        return res.status(500).json({ error: toApiError('Failed to load expenses', error) });
      }

      return res.status(200).json({ success: true, expenses: data || [] });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const payload = req.body || {};
      const description = sanitizeString(payload.description || '', 200);
      const category = sanitizeString(payload.category || 'general', 50);
      const amount = Number(payload.amount || 0);
      const expenseDate = payload.expense_date ? new Date(payload.expense_date) : new Date();

      if (!description || description.length < 2) {
        return res.status(400).json({ error: 'Description must be at least 2 characters' });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than 0' });
      }

      if (Number.isNaN(expenseDate.getTime())) {
        return res.status(400).json({ error: 'Invalid expense date' });
      }

      const { data, error } = await db
        .from('htv_expenses')
        .insert({
          description,
          category,
          amount,
          expense_date: expenseDate.toISOString().split('T')[0],
        })
        .select('*')
        .single();

      if (error) {
        return res.status(500).json({ error: toApiError('Failed to create expense', error) });
      }

      return res.status(200).json({ success: true, expense: data });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Expense ID is required' });
      }

      const { error } = await db.from('htv_expenses').delete().eq('id', id);

      if (error) {
        return res.status(500).json({ error: toApiError('Failed to delete expense', error) });
      }

      return res.status(200).json({ success: true, message: 'Expense deleted successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
