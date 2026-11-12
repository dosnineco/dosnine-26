import { timingSafeEqual } from 'crypto';
import { getDbClient, requireAdminUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';
import { sendBrevoEmail } from '@/lib/serviceRequestAllocation';

export const config = {
  maxDuration: 30,
};

function isAuthorizedCronRequest(req) {
  const secret = process.env.CRON_SECRET;
  const authorization = req.headers.authorization || '';
  if (!secret || !authorization.startsWith('Bearer ')) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function assertQuerySucceeded(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result;
}

function countDuring(db, table, timestampColumn, start, end) {
  return db
    .from(table)
    .select('id', { count: 'exact', head: true })
    .gte(timestampColumn, start.toISOString())
    .lt(timestampColumn, end.toISOString());
}

function formatChange(current, previous) {
  const difference = current - previous;
  if (difference === 0) return 'no change';
  return `${difference > 0 ? '+' : ''}${difference}`;
}

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET', 'POST'])) return;
  if (req.method === 'GET') {
    if (!process.env.CRON_SECRET) {
      return res.status(503).json({ error: 'CRON_SECRET is not configured' });
    }
    if (!isAuthorizedCronRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    if (req.method === 'POST') {
      const resolved = await requireAdminUser(req, res);
      if (!resolved) return;
    }

    const recipient = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL;
    if (!recipient) {
      return res.status(503).json({ error: 'ADMIN_NOTIFICATION_EMAIL or ADMIN_EMAIL is not configured' });
    }

    const db = getDbClient();
    const now = new Date();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const currentPeriodStart = new Date(now.getTime() - weekMs);
    const previousPeriodStart = new Date(now.getTime() - (2 * weekMs));
    const [
      requestsResult,
      applicationsResult,
      agentReviewsResult,
      agentPaymentsResult,
      advertisementsResult,
      htvOrdersResult,
      buyerReviewsResult,
      buyerDocumentsResult,
      requestsReceivedCurrent,
      requestsReceivedPrevious,
      requestsCompletedCurrent,
      requestsCompletedPrevious,
      buyersRegisteredCurrent,
      buyersRegisteredPrevious,
      htvOrdersCurrent,
      htvOrdersPrevious,
    ] = await Promise.all([
      db.from('service_requests').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      db.from('agent_request_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      db.from('agents').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      db.from('agents').select('id', { count: 'exact', head: true }).eq('payment_receipt_status', 'pending'),
      db.from('sponsor_submissions').select('id', { count: 'exact', head: true }).in('status', ['pending', 'pending_payment', 'pending_review']),
      db
        .from('htv_orders')
        .select('id', { count: 'exact', head: true })
        .or('status.is.null,status.not.ilike.completed'),
      db.from('buyer_prequalifications').select('id').in('status', ['registered', 'under_review']),
      db.from('buyer_documents').select('prequalification_id').eq('status', 'pending'),
      countDuring(db, 'service_requests', 'created_at', currentPeriodStart, now),
      countDuring(db, 'service_requests', 'created_at', previousPeriodStart, currentPeriodStart),
      countDuring(db, 'service_requests', 'completed_at', currentPeriodStart, now),
      countDuring(db, 'service_requests', 'completed_at', previousPeriodStart, currentPeriodStart),
      countDuring(db, 'buyer_prequalifications', 'created_at', currentPeriodStart, now),
      countDuring(db, 'buyer_prequalifications', 'created_at', previousPeriodStart, currentPeriodStart),
      countDuring(db, 'htv_orders', 'created_at', currentPeriodStart, now),
      countDuring(db, 'htv_orders', 'created_at', previousPeriodStart, currentPeriodStart),
    ]);

    assertQuerySucceeded(requestsResult, 'Open requests query failed');
    assertQuerySucceeded(applicationsResult, 'Agent applications query failed');
    assertQuerySucceeded(agentReviewsResult, 'Agent reviews query failed');
    assertQuerySucceeded(advertisementsResult, 'Advertisement submissions query failed');
    assertQuerySucceeded(htvOrdersResult, 'HTV orders query failed');
    assertQuerySucceeded(buyerReviewsResult, 'Buyer prequalifications query failed');
    assertQuerySucceeded(buyerDocumentsResult, 'Buyer documents query failed');
    assertQuerySucceeded(requestsReceivedCurrent, 'Recent customer requests query failed');
    assertQuerySucceeded(requestsReceivedPrevious, 'Previous customer requests query failed');
    assertQuerySucceeded(requestsCompletedCurrent, 'Recent completed requests query failed');
    assertQuerySucceeded(requestsCompletedPrevious, 'Previous completed requests query failed');
    assertQuerySucceeded(buyersRegisteredCurrent, 'Recent buyer registrations query failed');
    assertQuerySucceeded(buyersRegisteredPrevious, 'Previous buyer registrations query failed');
    assertQuerySucceeded(htvOrdersCurrent, 'Recent HTV orders query failed');
    assertQuerySucceeded(htvOrdersPrevious, 'Previous HTV orders query failed');

    let pendingAgentPayments = 0;
    let paymentReceiptsUnavailable = false;
    if (agentPaymentsResult.error) {
      if (!['42703', 'PGRST204'].includes(agentPaymentsResult.error.code)) {
        throw new Error(`Agent payment receipts query failed: ${agentPaymentsResult.error.message}`);
      }
      paymentReceiptsUnavailable = true;
    } else {
      pendingAgentPayments = agentPaymentsResult.count || 0;
    }

    const pendingBuyerIds = new Set((buyerReviewsResult.data || []).map((item) => item.id));
    (buyerDocumentsResult.data || []).forEach((document) => {
      pendingBuyerIds.add(document.prequalification_id);
    });

    const counts = [
      { label: 'Open customer requests', count: requestsResult.count || 0, path: '/admin/requests' },
      { label: 'Agent applications awaiting review', count: applicationsResult.count || 0, path: '/admin/agent-applications' },
      { label: 'Agent verifications awaiting review', count: agentReviewsResult.count || 0, path: '/admin/users?tab=agents' },
      { label: 'Agent payment receipts to verify', count: pendingAgentPayments, path: '/admin/users?tab=agents' },
      { label: 'Ad submissions awaiting action', count: advertisementsResult.count || 0, path: '/admin/advertisements' },
      {
        label: 'HTV orders not completed',
        count: htvOrdersResult.count || 0,
        path: '/admin/htv',
      },
      { label: 'Buyer checks needing review', count: pendingBuyerIds.size, path: '/admin/buyer-prequalifications' },
    ];
    const pendingTotal = counts.reduce((total, item) => total + item.count, 0);

    const progress = [
      {
        label: 'Customer requests received',
        current: requestsReceivedCurrent.count || 0,
        previous: requestsReceivedPrevious.count || 0,
      },
      {
        label: 'Customer requests completed',
        current: requestsCompletedCurrent.count || 0,
        previous: requestsCompletedPrevious.count || 0,
      },
      {
        label: 'Buyer assessments registered',
        current: buyersRegisteredCurrent.count || 0,
        previous: buyersRegisteredPrevious.count || 0,
      },
      {
        label: 'HTV orders received',
        current: htvOrdersCurrent.count || 0,
        previous: htvOrdersPrevious.count || 0,
      },
    ];

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dosnine.com').replace(/\/+$/, '');
    const date = new Intl.DateTimeFormat('en-JM', {
      dateStyle: 'long',
      timeZone: 'America/Jamaica',
    }).format(now);
    const period = `${currentPeriodStart.toLocaleDateString('en-JM', { timeZone: 'America/Jamaica' })} – ${now.toLocaleDateString('en-JM', { timeZone: 'America/Jamaica' })}`;
    const previousPeriod = `${previousPeriodStart.toLocaleDateString('en-JM', { timeZone: 'America/Jamaica' })} – ${currentPeriodStart.toLocaleDateString('en-JM', { timeZone: 'America/Jamaica' })}`;
    const rows = counts
      .filter((item) => item.count > 0)
      .map((item) => `<li><a href="${siteUrl}${item.path}">${item.label}</a>: <strong>${item.count}</strong></li>`)
      .join('');
    const progressRows = progress
      .map((item) => `<tr><td>${item.label}</td><td>${item.current}</td><td>${item.previous}</td><td>${formatChange(item.current, item.previous)}</td></tr>`)
      .join('');
    const textRows = counts
      .filter((item) => item.count > 0)
      .map((item) => `${item.label}: ${item.count} — ${siteUrl}${item.path}`)
      .join('\n');
    const textProgressRows = progress
      .map((item) => `${item.label}: ${item.current} (previous 7 days: ${item.previous}; change: ${formatChange(item.current, item.previous)})`)
      .join('\n');
    const setupNote = paymentReceiptsUnavailable
      ? '<p>Agent payment receipt counts are unavailable. Check that database migration 058 is applied.</p>'
      : '';

    await sendBrevoEmail({
      to: recipient,
      subject: `Dosnine operations: ${pendingTotal} items need attention — progress update (${date})`,
      htmlContent: `<h2>Dosnine operations digest</h2><p>${date}</p><h3>Progress and activity</h3><p>Last 7 days (${period}) compared with the previous 7 days (${previousPeriod}). These are activity counts; more requests indicate demand, while completed requests indicate delivery.</p><table><thead><tr><th>Measure</th><th>Last 7 days</th><th>Previous 7 days</th><th>Change</th></tr></thead><tbody>${progressRows}</tbody></table><h3>Items needing attention</h3><p><strong>${pendingTotal}</strong> items currently need attention.</p>${pendingTotal ? `<ul>${rows}</ul>` : '<p>Nothing is currently waiting for attention.</p>'}${setupNote}<p><a href="${siteUrl}/admin">Open the admin dashboard</a></p>`,
      textContent: `Dosnine operations digest — ${date}\n\nProgress and activity (last 7 days: ${period}; previous 7 days: ${previousPeriod})\n${textProgressRows}\n\n${pendingTotal} items currently need attention:${pendingTotal ? `\n${textRows}` : '\nNothing is currently waiting for attention.'}${paymentReceiptsUnavailable ? '\n\nAgent payment receipt counts are unavailable. Check that database migration 058 is applied.' : ''}\n\nAdmin dashboard: ${siteUrl}/admin`,
    });

    return res.status(200).json({ success: true, sent: true, pendingTotal, progress });
  } catch (error) {
    console.error('Scheduled operations digest failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to send operations digest' });
  }
}