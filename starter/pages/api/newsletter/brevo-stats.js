import * as SibApiV3Sdk from '@getbrevo/brevo';
import { requireAdminUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;

  const resolved = await requireAdminUser(req, res);
  if (!resolved) return;

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('BREVO_API_KEY not configured');
    return res.status(500).json({ error: 'Brevo API key is not configured' });
  }

  try {
    const apiInstance = new SibApiV3Sdk.EmailCampaignsApi();
    apiInstance.setApiKey(SibApiV3Sdk.EmailCampaignsApiApiKeys.apiKey, apiKey);

    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();

    let body;
    try {
      ({ body } = await apiInstance.getEmailCampaigns(
        'classic',
        'sent',
        'globalStats',
        startDate,
        endDate,
        12,
        0,
        'desc',
        true,
      ));
    } catch (error) {
      const isBadDate =
        (error?.statusCode === 400 || error?.response?.statusCode === 400) &&
        String(error?.message || '').toLowerCase().includes('date');
      if (isBadDate) {
        console.warn('Brevo stats date filter failed, retrying without date range');
        ({ body } = await apiInstance.getEmailCampaigns('classic', 'sent', 'globalStats', undefined, undefined, 12, 0, 'desc', true));
      } else {
        throw error;
      }
    }

    return res.status(200).json({ success: true, campaigns: body.campaigns || [] });
  } catch (error) {
    console.error('Brevo stats fetch error:', error);
    const message = error?.message || 'Failed to load Brevo campaign statistics';
    return res.status(500).json({ error: message });
  }
}
