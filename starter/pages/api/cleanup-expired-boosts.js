// API route to clean up expired boosts
// Can be called via cron job or manually

import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const now = new Date().toISOString();

    // Find expired boosts
    const { data: expiredBoosts, error: fetchError } = await supabase
      .from('property_boosts')
      .select('id, property_id')
      .eq('status', 'active')
      .lt('boost_end_date', now);

    if (fetchError) throw fetchError;

    if (expiredBoosts && expiredBoosts.length > 0) {
      // Update boost status to expired
      const boostIds = expiredBoosts.map(b => b.id);
      const { error: updateBoostError } = await supabase
        .from('property_boosts')
        .update({ status: 'expired' })
        .in('id', boostIds);

      if (updateBoostError) throw updateBoostError;

      // Check if properties have other active boosts
      const propertyIds = expiredBoosts.map(b => b.property_id);
      
      for (const propertyId of propertyIds) {
        const { data: activeBoosts } = await supabase
          .from('property_boosts')
          .select('id')
          .eq('property_id', propertyId)
          .eq('status', 'active')
          .gte('boost_end_date', now);

        // If no active boosts remain, remove featured flag
        if (!activeBoosts || activeBoosts.length === 0) {
          await supabase
            .from('properties')
            .update({ is_featured: false })
            .eq('id', propertyId);
        }
      }

      return res.status(200).json({
        success: true,
        message: `Expired ${expiredBoosts.length} boost(s)`,
        count: expiredBoosts.length
      });
    }

    return res.status(200).json({
      success: true,
      message: 'No expired boosts found',
      count: 0
    });

  } catch (error) {
    console.error('Error cleaning up boosts:', error);
    return res.status(500).json({ error: error.message });
  }
}
