import { timingSafeEqual } from 'crypto';
import { getDbClient } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { processNewsletterQueue } from '@/lib/newsletterQueue';

export const config = {
  maxDuration: 300,
};

function isAuthorizedCronRequest(req) {
  const secret = process.env.CRON_SECRET;
  const authorization = req.headers.authorization || '';
  if (!secret || !authorization.startsWith('Bearer ')) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;
  if (!process.env.CRON_SECRET) {
    return res.status(503).json({ error: 'CRON_SECRET is not configured' });
  }
  if (!isAuthorizedCronRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await processNewsletterQueue(getDbClient());
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Scheduled newsletter queue processing failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to process newsletter queue' });
  }
}
