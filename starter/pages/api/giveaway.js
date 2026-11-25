import { getDbClient } from '../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const now = new Date();
    const { data: campaign, error } = await getDbClient()
      .from('giveaway_campaigns')
      .select('title, prize_description, opens_at, draw_at, is_open, image_urls')
      .eq('id', 1)
      .maybeSingle();

    if (error) throw error;

    const isActive = Boolean(
      campaign?.is_open &&
      campaign.opens_at &&
      new Date(campaign.opens_at) <= now &&
      campaign.draw_at &&
      new Date(campaign.draw_at) >= now
    );

    return res.status(200).json({
      success: true,
      campaign: isActive ? campaign : null,
    });
  } catch (error) {
    console.error('Unable to load public giveaway:', error);
    return res.status(500).json({ error: 'Unable to load the giveaway.' });
  }
}
