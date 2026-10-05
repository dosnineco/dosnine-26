import { getDbClient, requireAdminUser } from '../../../../lib/apiAuth';
import { sendBrevoEmail } from '../../../../lib/serviceRequestAllocation';

const escapeHtml = (value) =>
  String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const { agentId, plan, accessExpiry = null } = req.body || {};
    if (!agentId || !plan) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validPlans = ['free', '7-day', '30-day', '90-day'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ error: 'Invalid access plan' });
    }

    const db = getDbClient();
    const now = new Date().toISOString();
    let paymentAmountToSave = null;
    let verifiedReceipt = false;
    let agentProfile = null;

    if (plan !== 'free') {
      const { data: agent, error: agentError } = await db
        .from('agents')
        .select(`
          payment_receipt_plan,
          payment_receipt_amount,
          payment_receipt_status,
          user:users!agents_user_id_fkey(email, full_name)
        `)
        .eq('id', agentId)
        .maybeSingle();
      if (agentError && agentError.code !== '42703') throw agentError;
      agentProfile = agent;
      if (
        !agentError &&
        agent?.payment_receipt_status === 'pending' &&
        agent.payment_receipt_plan === plan
      ) {
        const submittedAmount = Number(agent.payment_receipt_amount);
        if (!Number.isInteger(submittedAmount) || submittedAmount < 1) {
          return res.status(409).json({ error: 'The submitted receipt amount is invalid. Ask the agent to submit the receipt again.' });
        }
        paymentAmountToSave = submittedAmount;
        verifiedReceipt = true;
      }

      if (paymentAmountToSave === null) {
        const { data: pricing, error: pricingError } = await db
          .from('site_settings')
          .select('value')
          .eq('key', 'plan_prices')
          .maybeSingle();
        if (pricingError) throw pricingError;

        paymentAmountToSave = Number(pricing?.value?.[plan]);
        if (!Number.isInteger(paymentAmountToSave) || paymentAmountToSave < 1) {
          return res.status(503).json({ error: 'Agent plan pricing is not configured.' });
        }
      }
    }

    const updateData = {
      payment_status: plan,
      payment_date: plan !== 'free' ? now : null,
      payment_amount: paymentAmountToSave,
      access_expiry: accessExpiry,
      ...(verifiedReceipt ? { payment_receipt_status: 'verified' } : {}),
    };

    const { error } = await db
      .from('agents')
      .update(updateData)
      .eq('id', agentId);

    if (error) throw error;

    let emailWarning = null;
    if (verifiedReceipt) {
      const recipient = String(agentProfile?.user?.email || '').trim();
      if (!recipient || recipient.endsWith('@dosnine.local')) {
        emailWarning = 'Payment verified, but the agent email address is unavailable.';
        console.error(`Agent payment confirmation email skipped for ${agentId}: no recipient email.`);
      } else {
        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dosnine.com').replace(/\/+$/, '');
        const dashboardUrl = `${siteUrl}/agent/dashboard`;
        const agentName = agentProfile.user.full_name || 'there';
        const planName = plan === '7-day'
          ? '7-Day Access'
          : plan === '30-day'
          ? '1 Month Access'
          : '3 Month Access';
        const amountText = `J$${Number(paymentAmountToSave).toLocaleString()}`;
        try {
          await sendBrevoEmail({
            to: recipient,
            subject: 'Your Dosnine payment is verified',
            htmlContent: `
              <h2>Payment verified — your access is active</h2>
              <p>Hi ${escapeHtml(agentName)},</p>
              <p>We have verified your bank transfer and activated your agent access.</p>
              <p><strong>Plan:</strong> ${escapeHtml(planName)}<br />
              <strong>Amount:</strong> ${escapeHtml(amountText)}<br />
              <strong>Access expires:</strong> ${accessExpiry ? escapeHtml(new Date(accessExpiry).toLocaleDateString()) : 'Not specified'}</p>
              <p><a href="${dashboardUrl}">Sign in and open your agent dashboard</a></p>
              <p>Thank you,<br />Dosnine</p>
            `,
            textContent: [
              'Payment verified — your access is active',
              `Hi ${agentName},`,
              'We have verified your bank transfer and activated your agent access.',
              `Plan: ${planName}`,
              `Amount: ${amountText}`,
              `Access expires: ${accessExpiry ? new Date(accessExpiry).toLocaleDateString() : 'Not specified'}`,
              `Sign in and open your agent dashboard: ${dashboardUrl}`,
              'Thank you, Dosnine',
            ].join('\n\n'),
          });
        } catch (emailError) {
          emailWarning = 'Payment verified, but the confirmation email could not be sent.';
          console.error(`Agent payment confirmation email failed for ${agentId}:`, emailError);
        }
      }
    }

    return res.status(200).json({ success: true, paymentAmount: paymentAmountToSave, emailWarning });
  } catch (error) {
    console.error('Admin agent payment plan API error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Request failed';
    return res.status(500).json({ error: message });
  }
}
