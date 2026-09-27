import { getDbClient, requireAdminUser } from '../../../lib/apiAuth';
import { enforceRateLimitDistributed } from '../../../lib/rateLimit';

/* ----------------------------------------------------------
 * Validators
 * ---------------------------------------------------------- */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidUuid = (value) =>
  typeof value === 'string' && UUID_REGEX.test(value);

const ALLOWED_ACTIONS = new Set([
  'assign',
  'complete',
  'incomplete',
  'unassign',
  'reactivate',
  'contacted',
  'uncontacted',
  'remove-comments',
  'delete',
  'edit',
]);

const MAX_IDS_PER_CALL = 100;

/* Fields a client can edit on a service request, with a sanitiser per field */
const EDITABLE_FIELDS = {
  client_name: (v) => (typeof v === 'string' ? v.trim().slice(0, 120) : undefined),
  client_email: (v) =>
    typeof v === 'string' && /^\S+@\S+\.\S+$/.test(v.trim())
      ? v.trim().slice(0, 160)
      : undefined,
  client_phone: (v) => (typeof v === 'string' ? v.trim().slice(0, 40) : undefined),
  location: (v) => (typeof v === 'string' ? v.trim().slice(0, 160) : undefined),
  property_type: (v) => (typeof v === 'string' ? v.trim().slice(0, 60) : undefined),
  request_type: (v) =>
    typeof v === 'string' && ['buy', 'rent', 'sell'].includes(v.trim().toLowerCase())
      ? v.trim().toLowerCase()
      : undefined,
  bedrooms: (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 20 ? Math.floor(n) : undefined;
  },
  bathrooms: (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 20 ? Math.floor(n) : undefined;
  },
  budget_min: (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  },
  budget_max: (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  },
  urgency: (v) =>
    typeof v === 'string' && ['normal', 'urgent'].includes(v.trim().toLowerCase())
      ? v.trim().toLowerCase()
      : undefined,
  description: (v) =>
    typeof v === 'string' ? v.trim().slice(0, 4000) : undefined,
};

function sanitizeEditFields(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const clean = {};
  for (const [key, value] of Object.entries(raw)) {
    const fn = EDITABLE_FIELDS[key];
    if (!fn) continue;
    const next = fn(value);
    if (next !== undefined) clean[key] = next;
  }
  return Object.keys(clean).length > 0 ? clean : null;
}

export default async function handler(req, res) {
  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'requests-mgmt',
    maxRequests: 60,
    windowMs: 60 * 1000,
  });

  if (!rate.allowed) {
    return res.status(429).json({
      error: 'Too many requests. Please slow down.',
      retryAfter: rate.retryAfterSeconds,
    });
  }

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const db = getDbClient();

    /* ----------------------------------------------------------
     * GET — list requests + assignable agents
     * ---------------------------------------------------------- */
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store, private, max-age=0');

      const { data: requests, error: requestsError } = await db
        .from('service_requests')
        .select('*')
        .order('updated_at', { ascending: false });

      if (requestsError) throw requestsError;

      const { data: agentsRaw, error: agentsError } = await db
        .from('agents')
        .select('id, business_name, users:user_id(full_name, email)')
        .order('business_name');

      if (agentsError) throw agentsError;

      const agents = (agentsRaw || []).map((item) => ({
        id: item.id,
        name: item.users?.full_name || item.business_name || 'Unknown Agent',
        email: item.users?.email || 'No email',
      }));

      return res.status(200).json({
        success: true,
        requests: requests || [],
        agents,
      });
    }

    /* ----------------------------------------------------------
     * POST — bulk actions + edit
     * ---------------------------------------------------------- */
    if (req.method === 'POST') {
      const { action, ids, agentId, fields } = req.body || {};

      if (typeof action !== 'string' || !ALLOWED_ACTIONS.has(action)) {
        return res.status(400).json({ error: 'Invalid or missing action' });
      }

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Missing request ids' });
      }
      if (ids.length > MAX_IDS_PER_CALL) {
        return res
          .status(400)
          .json({ error: `Too many ids in a single call (max ${MAX_IDS_PER_CALL})` });
      }
      if (!ids.every(isValidUuid)) {
        return res
          .status(400)
          .json({ error: 'One or more ids are not valid UUIDs' });
      }

      if (action === 'assign' && !isValidUuid(agentId)) {
        return res
          .status(400)
          .json({ error: 'Missing or invalid agentId for assign action' });
      }

      // Edit only makes sense for a single id
      if (action === 'edit' && ids.length !== 1) {
        return res
          .status(400)
          .json({ error: 'Edit requires exactly one id' });
      }

      // Verify every id exists (fixes IDOR probe)
      const { data: existing, error: lookupError } = await db
        .from('service_requests')
        .select('id')
        .in('id', ids);

      if (lookupError) throw lookupError;

      const existingIds = new Set((existing || []).map((row) => row.id));
      const missingIds = ids.filter((id) => !existingIds.has(id));

      if (missingIds.length > 0) {
        return res.status(404).json({
          error: 'One or more requests were not found',
          missingIds,
        });
      }

      const now = new Date().toISOString();

      /* ---------- EDIT ---------- */
      if (action === 'edit') {
        const clean = sanitizeEditFields(fields);
        if (!clean) {
          return res
            .status(400)
            .json({ error: 'No valid editable fields provided' });
        }

        // Guard against min > max
        if (
          clean.budget_min != null &&
          clean.budget_max != null &&
          clean.budget_min > clean.budget_max
        ) {
          return res
            .status(400)
            .json({ error: 'budget_min cannot be greater than budget_max' });
        }

        const { error } = await db
          .from('service_requests')
          .update({ ...clean, updated_at: now })
          .eq('id', ids[0]);

        if (error) throw error;

        return res.status(200).json({ success: true, updated: clean });
      }

      /* ---------- DELETE ---------- */
      if (action === 'delete') {
        const { error } = await db
          .from('service_requests')
          .delete()
          .in('id', ids);

        if (error) throw error;
        return res.status(200).json({ success: true, affected: ids.length });
      }

      /* ---------- STATUS / ASSIGN / CONTACT ---------- */
      let payload = null;

      if (action === 'assign') {
        payload = {
          assigned_agent_id: agentId,
          status: 'assigned',
          updated_at: now,
        };
      } else if (action === 'complete') {
        payload = { status: 'completed', completed_at: now, updated_at: now };
      } else if (action === 'incomplete') {
        payload = { status: 'open', completed_at: null, updated_at: now };
      } else if (action === 'unassign') {
        payload = {
          assigned_agent_id: null,
          status: 'open',
          updated_at: now,
        };
      } else if (action === 'reactivate') {
        payload = { status: 'open', updated_at: now };
      } else if (action === 'contacted') {
        payload = { is_contacted: true, updated_at: now };
      } else if (action === 'uncontacted') {
        payload = { is_contacted: false, updated_at: now };
      } else if (action === 'remove-comments') {
        payload = { comment: null, updated_at: now };
      }

      if (!payload) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      const { error } = await db
        .from('service_requests')
        .update(payload)
        .in('id', ids);

      if (error) throw error;

      return res.status(200).json({ success: true, affected: ids.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin requests-management API error:', error);
    const message =
      typeof error?.message === 'string' ? error.message : 'Request failed';
    return res.status(500).json({ error: message });
  }
}