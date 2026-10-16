import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods, sanitizeInt, sanitizeLocation, sanitizeMoney, sanitizeString } from '@/lib/apiSecurity';
import { z } from 'zod';

const updateSchema = z.object({
  location: z.string().trim().min(1).max(255),
  budgetMin: z.union([
    z.number().finite().nonnegative().max(99999999999999),
    z.string().trim().max(20).regex(/^\d{1,14}(?:\.\d{1,2})?$/),
  ]),
  budgetMax: z.union([
    z.number().finite().nonnegative().max(99999999999999),
    z.string().trim().max(20).regex(/^\d{1,14}(?:\.\d{1,2})?$/),
  ]),
  bedrooms: z.union([z.number(), z.string()]).nullable(),
  bathrooms: z.union([z.number(), z.string()]).nullable(),
  description: z.string().max(5000).nullable().optional(),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']),
});

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['PUT'])) return;
  const resolved = await requireDbUser(req, res, { createIfMissing: true });
  if (!resolved) return;
  const id = z.string().uuid().safeParse(req.query.id);
  const parsed = updateSchema.safeParse(req.body || {});
  if (!id.success || !parsed.success) return res.status(400).json({ error: 'Invalid request details' });

  const min = sanitizeMoney(parsed.data.budgetMin);
  const max = sanitizeMoney(parsed.data.budgetMax);
  const location = sanitizeLocation(parsed.data.location);
  if (!location || min > max) {
    return res.status(400).json({ error: 'Enter a valid budget range with a maximum not below the minimum' });
  }

  try {
    const { data, error } = await getDbClient()
      .from('service_requests')
      .update({
        location,
        budget_min: min,
        budget_max: max,
        bedrooms: sanitizeInt(parsed.data.bedrooms, 0, 99),
        bathrooms: sanitizeInt(parsed.data.bathrooms, 0, 99),
        description: sanitizeString(parsed.data.description || '', 5000),
        urgency: parsed.data.urgency,
      })
      .eq('id', id.data)
      .eq('client_user_id', resolved.user.id)
      .not('status', 'in', '("completed","cancelled","deleted")')
      .select('id, location, budget_min, budget_max, bedrooms, bathrooms, description, urgency, updated_at')
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Request not found or no longer editable' });
    return res.status(200).json({ success: true, request: data });
  } catch (error) {
    console.error('Updating buyer service request failed:', error);
    return res.status(500).json({ error: 'Unable to update this request' });
  }
}
