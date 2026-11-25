import { getDbClient, requireDbUser } from '../../../lib/apiAuth';
import {
  getGiveawayEligibility,
  isGiveawayEligible,
} from '../../../lib/giveawayEligibility';
import { getRentalReadinessLevel } from '../../../lib/renterReadiness';

function parseOptionalAmount(value) {
  if (value === '' || value === null || value === undefined) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 1000000000 ? amount : undefined;
}

export default async function handler(req, res) {
  if (!['GET', 'PATCH'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res, { createIfMissing: true });
    if (!resolved) return;

    const db = getDbClient();
    if (req.method === 'PATCH') {
      const { full_name, phone, rentalReadiness } = req.body || {};
      const updates = {};

      if (full_name !== undefined) {
        if (typeof full_name !== 'string' || !full_name.trim() || full_name.trim().length > 120) {
          return res.status(400).json({ error: 'Enter a name between 1 and 120 characters.' });
        }
        updates.full_name = full_name.trim();
      }

      if (phone !== undefined) {
        if (phone !== null && (typeof phone !== 'string' || phone.trim().length > 32)) {
          return res.status(400).json({ error: 'Enter a phone number no longer than 32 characters.' });
        }
        updates.phone = phone?.trim() || null;
      }

      if (Object.keys(updates).length === 0 && rentalReadiness === undefined) {
        return res.status(400).json({ error: 'No profile changes provided.' });
      }

      let rentalProfile = null;
      if (rentalReadiness !== undefined) {
        if (resolved.user.account_type !== 'regular') {
          return res.status(403).json({ error: 'Rental readiness is only available to regular accounts.' });
        }
        if (!rentalReadiness || typeof rentalReadiness !== 'object' || Array.isArray(rentalReadiness)) {
          return res.status(400).json({ error: 'Enter valid rental readiness details.' });
        }
        const { employment_status, move_in_date, occupants, has_rental_references } = rentalReadiness;
        if (employment_status != null && (typeof employment_status !== 'string' || employment_status.trim().length > 80)) {
          return res.status(400).json({ error: 'Employment status must be 80 characters or less.' });
        }
        if (move_in_date && (
          typeof move_in_date !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(move_in_date) ||
          Number.isNaN(new Date(`${move_in_date}T00:00:00Z`).getTime()) ||
          new Date(`${move_in_date}T00:00:00Z`).toISOString().slice(0, 10) !== move_in_date
        )) {
          return res.status(400).json({ error: 'Enter a valid move-in date.' });
        }
        if (occupants !== '' && occupants != null && (!Number.isInteger(Number(occupants)) || Number(occupants) < 1 || Number(occupants) > 30)) {
          return res.status(400).json({ error: 'Household size must be between 1 and 30.' });
        }
        if (has_rental_references !== undefined && typeof has_rental_references !== 'boolean') {
          return res.status(400).json({ error: 'Rental references must be true or false.' });
        }

        const monthlyRentBudget = parseOptionalAmount(rentalReadiness.monthly_rent_budget);
        const monthlyIncome = parseOptionalAmount(rentalReadiness.monthly_income);
        if (monthlyRentBudget === undefined || monthlyIncome === undefined) {
          return res.status(400).json({ error: 'Income and rent budget must be valid non-negative amounts.' });
        }

        rentalProfile = {
          user_id: resolved.user.id,
          monthly_rent_budget: monthlyRentBudget,
          monthly_income: monthlyIncome,
          employment_status: employment_status?.trim() || null,
          move_in_date: move_in_date || null,
          occupants: occupants === '' || occupants == null ? null : Number(occupants),
          has_rental_references: Boolean(has_rental_references),
          updated_at: new Date().toISOString(),
        };
        rentalProfile.qualification_level = getRentalReadinessLevel(rentalProfile);
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await db.from('users').update(updates).eq('id', resolved.user.id);
        if (error) throw error;
      }

      if (rentalProfile) {
        const { error } = await db.from('renter_readiness_profiles').upsert(rentalProfile, { onConflict: 'user_id' });
        if (error) throw error;
      }

      return res.status(200).json({ success: true });
    }

    const now = new Date();
    const { error: activityError } = await db
      .from('users')
      .update({ last_active_at: now.toISOString() })
      .eq('id', resolved.user.id);
    if (activityError) throw activityError;

    const [
      { data: userData, error: userError },
      { data: agentData, error: agentError },
      { data: rentalReadiness, error: rentalError },
      { data: requests, error: requestsError },
      { data: buyerReadiness, error: buyerError },
      { data: campaign, error: campaignError },
      { data: premiumReceipt, error: premiumReceiptError },
    ] = await Promise.all([
      db.from('users')
        .select('id, clerk_id, email, full_name, phone, profile_image_url, role, account_type, profile_intent, user_type, identity_verified, id_verification_status, created_at, last_active_at, premium_service_request, premium_service_request_expires')
        .eq('id', resolved.user.id)
        .single(),
      db.from('agents').select('*').eq('user_id', resolved.user.id).maybeSingle(),
      db.from('renter_readiness_profiles')
        .select('monthly_rent_budget, monthly_income, employment_status, move_in_date, occupants, has_rental_references, qualification_level, updated_at')
        .eq('user_id', resolved.user.id)
        .maybeSingle(),
      db.from('service_requests')
        .select('id, request_type, created_at')
        .eq('client_user_id', resolved.user.id),
      db.from('buyer_prequalifications')
        .select('qualification_level, status, verification_expires_at')
        .eq('buyer_user_id', resolved.user.id),
      db.from('giveaway_campaigns')
        .select('title, prize_description, opens_at, draw_at, is_open, winner_user_id, winner_request_id, winner_selected_at')
        .eq('id', 1)
        .maybeSingle(),
      resolved.user.account_type === 'regular'
        ? db.from('bank_transfer_payments')
          .select('id, amount, currency, reference_ids, receipt_path, status, submitted_at')
          .eq('source_type', 'premium')
          .eq('source_id', resolved.user.id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (userError) throw userError;
    if (agentError) throw agentError;
    if (rentalError) throw rentalError;
    if (requestsError) throw requestsError;
    if (buyerError) throw buyerError;
    if (campaignError) throw campaignError;
    if (premiumReceiptError) throw premiumReceiptError;

    let premiumPaymentReceipt = null;
    if (premiumReceipt) {
      const { data: signedReceipt, error: signedReceiptError } = await db.storage
        .from('payment-receipts')
        .createSignedUrl(premiumReceipt.receipt_path, 3600);
      if (signedReceiptError) throw signedReceiptError;
      premiumPaymentReceipt = {
        amount: Number(premiumReceipt.amount),
        currency: premiumReceipt.currency || 'JMD',
        referenceIds: premiumReceipt.reference_ids || [],
        status: premiumReceipt.status,
        submittedAt: premiumReceipt.submitted_at,
        url: signedReceipt.signedUrl,
      };
    }

    const eligibility = getGiveawayEligibility({
      user: userData,
      buyerReadiness: buyerReadiness || [],
      rentalReadiness,
      now,
    });
    const buyerLevel = Math.max(0, ...(buyerReadiness || [])
      .filter((assessment) => (
        ['verified', 'confirmed'].includes(assessment.status) &&
        (!assessment.verification_expires_at || new Date(assessment.verification_expires_at).getTime() > now.getTime())
      ))
      .map((assessment) => Number(assessment.qualification_level) || 0));
    const giveawayOpen = Boolean(
      campaign?.is_open &&
      campaign.opens_at &&
      new Date(campaign.opens_at) <= now &&
      campaign.draw_at &&
      new Date(campaign.draw_at) >= now
    );

    return res.status(200).json({
      ...userData,
      agent: agentData || null,
      premium: eligibility.isPremium,
      premiumPaymentReceipt,
      rentalReadiness: rentalReadiness || null,
      readiness: {
        buyerLevel,
        rentalLevel: Number(rentalReadiness?.qualification_level) || 0,
      },
      giveaway: userData.account_type === 'regular' && giveawayOpen ? {
        ...campaign,
        open: true,
        eligibility,
        eligible: isGiveawayEligible(eligibility),
        requestCount: (requests || []).length,
      } : null,
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error?.message || 'Server error' });
  }
}
