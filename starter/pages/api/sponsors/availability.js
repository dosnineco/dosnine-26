import { getDbClient } from '@/lib/apiAuth';

const MONTHLY_SPONSOR_CAPACITY = 40;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dateParts = new Intl.DateTimeFormat('en', {
      timeZone: 'America/Jamaica',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(new Date());
    const year = dateParts.find((part) => part.type === 'year')?.value;
    const month = dateParts.find((part) => part.type === 'month')?.value;
    const scheduledMonth = `${year}-${month}-01`;
    const db = getDbClient();
    let capacityWarning = null;
    const { error: waitlistError } = await db.rpc(
      'promote_available_waitlisted_sponsor_submissions'
    );
    if (waitlistError) {
      capacityWarning = 'Paid waitlist auto-promotion requires database migration 057.';
      console.error('Automatic sponsor waitlist promotion failed:', waitlistError);
    }

    let { count, error } = await db
      .from('sponsor_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('payment_status', 'paid')
      .eq('scheduled_month', scheduledMonth)
      .is('capacity_released_at', null)
      .neq('status', 'rejected');

    if (error && ['42703', 'PGRST204'].includes(error.code)) {
      const legacyCapacity = await db
        .from('sponsor_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('payment_status', 'paid')
        .eq('scheduled_month', scheduledMonth)
        .neq('status', 'rejected');
      count = legacyCapacity.count;
      error = legacyCapacity.error;
      capacityWarning = 'Monthly slot releases require database migration 056.';
    }
    if (error) throw error;

    let adPlanPrices = { '14-day': 17999, '30-day': 52499, pro: 90999 };
    const { data: pricing, error: pricingError } = await db
      .from('site_settings')
      .select('value')
      .eq('key', 'ad_plan_prices')
      .maybeSingle();
    if (pricingError) {
      if (['PGRST205', '42P01'].includes(pricingError.code)) {
        console.error('Ad pricing settings are not configured; using default prices:', pricingError);
      } else {
        throw pricingError;
      }
    } else {
      adPlanPrices = { ...adPlanPrices, ...(pricing?.value || {}) };
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({
      success: true,
      capacity: MONTHLY_SPONSOR_CAPACITY,
      reserved: count || 0,
      available: Math.max(0, MONTHLY_SPONSOR_CAPACITY - (count || 0)),
      adPlanPrices,
      capacityWarning,
    });
  } catch (error) {
    console.error('Sponsor availability lookup failed:', error);
    return res.status(500).json({ error: 'Unable to retrieve sponsor availability.' });
  }
}
