import { z } from 'zod';
import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { canManageProperties } from '@/lib/rbac';

const schema = z.object({
  propertyId: z.string().uuid(),
  status: z.enum(['sold', 'rented', 'leased']),
});

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;
  const resolved = await requireDbUser(req, res, { createIfMissing: true });
  if (!resolved) return;
  if (!canManageProperties(resolved.user)) {
    return res.status(403).json({ error: 'A verified homeowner or agent account is required to manage properties.' });
  }

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'A valid property and unavailable status are required.' });

  const db = getDbClient();
  try {
    const { data: property, error: propertyError } = await db
      .from('properties')
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq('id', parsed.data.propertyId)
      .eq('owner_id', resolved.user.id)
      .select('id, status')
      .maybeSingle();
    if (propertyError) throw propertyError;
    if (!property) return res.status(404).json({ error: 'Property not found.' });

    const { error: expiryError } = await db.rpc('expire_property_boosts');
    if (expiryError) throw expiryError;
    return res.status(200).json({ success: true, property });
  } catch (error) {
    console.error('Unable to mark property unavailable:', error);
    return res.status(500).json({ error: 'Unable to update the property status.' });
  }
}
