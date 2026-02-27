import { getDbClient, requireAdminUser } from '@/lib/apiAuth';

function toApiError(defaultMessage, error) {
  if (!error) return defaultMessage;
  return error.message || error.details || error.hint || defaultMessage;
}

async function safeDeleteByPropertyId(db, table, propertyId) {
  const { error } = await db.from(table).delete().eq('property_id', propertyId);

  if (!error) return null;

  if (error.code === '42P01') {
    return null;
  }

  return error;
}

export default async function handler(req, res) {
  const admin = await requireAdminUser(req, res);
  if (!admin) return;

  const db = getDbClient();

  if (req.method === 'GET') {
    try {
      const { data, error } = await db
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: toApiError('Failed to load properties', error) });
      }

      const properties = (data || []).map((property) => ({
        ...property,
        is_active: (property.status || 'available') === 'available',
      }));

      return res.status(200).json({ success: true, properties });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const payload = req.body || {};
      const isActive = payload.is_active !== false;
      const { data, error } = await db
        .from('properties')
        .insert([{
          title: payload.title,
          parish: payload.parish || null,
          price: payload.price,
          bedrooms: payload.bedrooms || null,
          bathrooms: payload.bathrooms || null,
          description: payload.description || null,
          is_featured: Boolean(payload.is_featured),
          status: isActive ? 'available' : 'inactive',
        }])
        .select('*')
        .single();

      if (error) {
        return res.status(500).json({ error: toApiError('Failed to create property', error) });
      }

      return res.status(200).json({
        success: true,
        property: {
          ...data,
          is_active: (data?.status || 'available') === 'available',
        },
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { id, ...payload } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'Property id is required' });
      }

      const isActive = payload.is_active !== false;

      const { data, error } = await db
        .from('properties')
        .update({
          title: payload.title,
          parish: payload.parish || null,
          price: payload.price,
          bedrooms: payload.bedrooms || null,
          bathrooms: payload.bathrooms || null,
          description: payload.description || null,
          is_featured: Boolean(payload.is_featured),
          status: isActive ? 'available' : 'inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return res.status(500).json({ error: toApiError('Failed to update property', error) });
      }

      return res.status(200).json({
        success: true,
        property: {
          ...data,
          is_active: (data?.status || 'available') === 'available',
        },
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'Property id is required' });
      }

      const propertyImageDeleteError = await safeDeleteByPropertyId(db, 'property_images', id);
      if (propertyImageDeleteError) {
        return res.status(500).json({
          error: toApiError('Failed to delete property images', propertyImageDeleteError),
        });
      }

      const applicationsDeleteError = await safeDeleteByPropertyId(db, 'applications', id);
      if (applicationsDeleteError) {
        return res.status(500).json({
          error: toApiError('Failed to delete property applications', applicationsDeleteError),
        });
      }

      const { error } = await db.from('properties').delete().eq('id', id);
      if (error) {
        return res.status(500).json({ error: toApiError('Failed to delete property', error) });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
