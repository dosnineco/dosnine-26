import { getDbClient, requireAdminUser } from '../../../lib/apiAuth';
import { getGiveawayEligibility, isGiveawayEligible } from '../../../lib/giveawayEligibility';

async function getGiveaway(db) {
  const { data, error } = await db
    .from('giveaway_campaigns')
    .select('id, title, prize_description, opens_at, draw_at, is_open, winner_user_id, winner_request_id, winner_selected_at')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data || {
    id: 1,
    title: 'Win a 3-night Airbnb stay',
    prize_description: 'A 3-night Airbnb stay',
    opens_at: null,
    draw_at: null,
    is_open: false,
    winner_user_id: null,
    winner_request_id: null,
    winner_selected_at: null,
  };
}

async function getEligibleEntrants(db, now) {
  const users = [];
  const pageSize = 1000;
  const activeCutoff = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString();
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await db
      .from('users')
      .select('id, full_name, email, account_type, last_active_at, premium_service_request, premium_service_request_expires')
      .eq('account_type', 'regular')
      .eq('premium_service_request', true)
      .gt('premium_service_request_expires', now.toISOString())
      .gte('last_active_at', activeCutoff)
      .order('id')
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    users.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  const userIds = (users || []).map((user) => user.id).filter(Boolean);
  if (!userIds.length) return [];

  const [requestsResult, boostsResult, buyersResult, rentalsResult] = await Promise.all([
    db.from('service_requests')
      .select('id, client_user_id, request_type, created_at')
      .in('client_user_id', userIds),
    db.from('service_request_urgency_boost_batches')
      .select('client_user_id, service_request_ids, status')
      .in('client_user_id', userIds)
      .eq('status', 'paid'),
    db.from('buyer_prequalifications')
      .select('buyer_user_id, qualification_level, status, verification_expires_at')
      .in('buyer_user_id', userIds),
    db.from('renter_readiness_profiles')
      .select('user_id, qualification_level')
      .in('user_id', userIds),
  ]);
  if (requestsResult.error) throw requestsResult.error;
  if (boostsResult.error) throw boostsResult.error;
  if (buyersResult.error) throw buyersResult.error;
  if (rentalsResult.error) throw rentalsResult.error;

  return (users || []).map((user) => {
    const requests = (requestsResult.data || []).filter((item) => item.client_user_id === user.id);
    const eligibility = getGiveawayEligibility({
      user,
      requests,
      boosts: (boostsResult.data || []).filter((item) => item.client_user_id === user.id),
      buyerReadiness: (buyersResult.data || []).filter((item) => item.buyer_user_id === user.id),
      rentalReadiness: (rentalsResult.data || []).find((item) => item.user_id === user.id),
      now,
    });
    if (!isGiveawayEligible(eligibility)) return null;
    return {
      user_id: user.id,
      full_name: user.full_name,
      email: user.email,
      requests: requests.map(({ id, request_type, created_at }) => ({ id, request_type, created_at })),
      eligibility,
    };
  }).filter(Boolean);
}

export default async function handler(req, res) {
  if (!['GET', 'PATCH'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resolved = await requireAdminUser(req, res);
  if (!resolved) return;

  try {
    const db = getDbClient();
    const now = new Date();
    const campaign = await getGiveaway(db);

    if (req.method === 'GET') {
      const entrants = campaign.is_open ? await getEligibleEntrants(db, now) : [];
      return res.status(200).json({ success: true, campaign, entrants });
    }

    const {
      title,
      prize_description,
      opens_at,
      draw_at,
      is_open,
      winner_user_id,
      winner_request_id,
    } = req.body || {};

    if (winner_user_id !== undefined) {
      if (!campaign.is_open || !campaign.draw_at || new Date(campaign.draw_at) > now) {
        return res.status(409).json({ error: 'The winner can only be selected on or after the scheduled draw date.' });
      }
      if (typeof winner_user_id !== 'string' || typeof winner_request_id !== 'string') {
        return res.status(400).json({ error: 'Select an eligible winner and one of their requests.' });
      }

      const entrants = await getEligibleEntrants(db, now);
      const selectedEntrant = entrants.find((entrant) => entrant.user_id === winner_user_id);
      if (!selectedEntrant || !selectedEntrant.requests.some((request) => request.id === winner_request_id)) {
        return res.status(400).json({ error: 'The selected account or request is no longer eligible.' });
      }
      const { data, error } = await db
        .from('giveaway_campaigns')
        .update({
          winner_user_id,
          winner_request_id,
          winner_selected_at: now.toISOString(),
          is_open: false,
          updated_at: now.toISOString(),
        })
        .eq('id', 1)
        .is('winner_user_id', null)
        .select('id, title, prize_description, opens_at, draw_at, is_open, winner_user_id, winner_request_id, winner_selected_at')
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(409).json({ error: 'A winner has already been selected for this giveaway.' });
      return res.status(200).json({ success: true, campaign: data });
    }

    const update = {};
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) {
        return res.status(400).json({ error: 'Enter a giveaway title between 1 and 120 characters.' });
      }
      update.title = title.trim();
    }
    if (prize_description !== undefined) {
      if (typeof prize_description !== 'string' || !prize_description.trim() || prize_description.trim().length > 500) {
        return res.status(400).json({ error: 'Enter a prize description no longer than 500 characters.' });
      }
      update.prize_description = prize_description.trim();
    }
    if (opens_at !== undefined) {
      const timestamp = opens_at ? Date.parse(opens_at) : NaN;
      if (opens_at && !Number.isFinite(timestamp)) return res.status(400).json({ error: 'Enter a valid opening date.' });
      update.opens_at = opens_at ? new Date(timestamp).toISOString() : null;
    }
    if (draw_at !== undefined) {
      const timestamp = draw_at ? Date.parse(draw_at) : NaN;
      if (draw_at && !Number.isFinite(timestamp)) return res.status(400).json({ error: 'Enter a valid giveaway date.' });
      update.draw_at = draw_at ? new Date(timestamp).toISOString() : null;
    }
    if (is_open !== undefined) {
      if (typeof is_open !== 'boolean') return res.status(400).json({ error: 'Giveaway status must be open or closed.' });
      if (is_open && (!campaign.opens_at && !update.opens_at || !campaign.draw_at && !update.draw_at)) {
        return res.status(400).json({ error: 'Set the opening and giveaway dates before opening the giveaway.' });
      }
      update.is_open = is_open;
    }
    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'No giveaway changes provided.' });

    const nextOpensAt = update.opens_at !== undefined ? update.opens_at : campaign.opens_at;
    const nextDrawAt = update.draw_at !== undefined ? update.draw_at : campaign.draw_at;
    if (nextOpensAt && nextDrawAt && new Date(nextDrawAt) <= new Date(nextOpensAt)) {
      return res.status(400).json({ error: 'The giveaway date must be after the opening date.' });
    }
    if (update.is_open === true && campaign.winner_user_id) {
      if (update.opens_at === undefined || update.draw_at === undefined || !nextOpensAt || !nextDrawAt) {
        return res.status(409).json({ error: 'Set new opening and giveaway dates before starting another giveaway.' });
      }
      if (new Date(nextDrawAt) <= new Date(campaign.draw_at)) {
        return res.status(409).json({ error: 'The next giveaway date must be after the previous giveaway.' });
      }
      update.winner_user_id = null;
      update.winner_request_id = null;
      update.winner_selected_at = null;
    }
    update.updated_at = now.toISOString();

    const { data, error } = await db
      .from('giveaway_campaigns')
      .upsert({ id: 1, ...campaign, ...update }, { onConflict: 'id' })
      .select('id, title, prize_description, opens_at, draw_at, is_open, winner_user_id, winner_request_id, winner_selected_at')
      .single();
    if (error) throw error;
    return res.status(200).json({ success: true, campaign: data });
  } catch (error) {
    console.error('Giveaway administration failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to manage the giveaway.' });
  }
}
