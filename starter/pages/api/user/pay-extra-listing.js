import { getDbClient, requireDbUser } from '@/lib/apiAuth';

const EXTRA_LISTING_FEE = 1500;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res);
    if (!resolved) return;

    const db = getDbClient();

    const { data: current, error: fetchError } = await db
      .from('users')
      .select('extra_listings_paid')
      .eq('id', resolved.user.id)
      .single();

    if (fetchError) throw fetchError;

    const nextCount = Number(current?.extra_listings_paid || 0) + 1;

    const { error: updateError } = await db
      .from('users')
      .update({ extra_listings_paid: nextCount })
      .eq('id', resolved.user.id);

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      extraListingsPaid: nextCount,
      feeAmount: EXTRA_LISTING_FEE,
    });
  } catch (error) {
    console.error('Pay extra listing error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process listing payment' });
  }
}
