import { getAuth } from '@clerk/nextjs/server';
import { verifyToken } from '@clerk/backend';
import { clerkClient } from '@clerk/nextjs/server';
import { getDbClient } from '@/lib/apiAuth';

/* --------------------------------------------------------------
 * Auth — Bearer preferred, cookie fallback
 * -------------------------------------------------------------- */
async function resolveUserId(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      if (payload?.sub) return payload.sub;
    } catch (err) {
      console.warn('[send-email] Bearer verify failed:', err.message);
    }
  }
  const { userId } = getAuth(req);
  return userId || null;
}

/* --------------------------------------------------------------
 * Clerk user lookup — primary email + name
 * -------------------------------------------------------------- */
async function getClerkUser(userId) {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const primaryId = user.primaryEmailAddressId;
    const primary = user.emailAddresses.find((e) => e.id === primaryId);
    return {
      email: primary?.emailAddress || null,
      fullName:
        [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
        null,
    };
  } catch (err) {
    console.error('[send-email] Clerk user lookup failed:', err);
    return null;
  }
}

/* --------------------------------------------------------------
 * Email template — plain, single-CTA, on brand
 * -------------------------------------------------------------- */
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildEmailHtml({ code, verifyUrl, expiresAt, fullName }) {
  const displayCode = String(code || '').replace(/(\d{3})(\d{3})/, '$1 $2');
  const greeting = fullName ? `Hi ${escapeHtml(fullName.split(' ')[0])},` : 'Hi,';
  const expiryTime = new Date(expiresAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your verification code</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f7fb;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
          style="width:100%;max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

          <!-- Accent bar -->
          <tr><td style="height:6px;background:#2373F4;line-height:0;font-size:0;">&nbsp;</td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 28px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#2373F4;">
                Dosnine · Secure verification
              </p>
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:#0f172a;">
                Your verification code
              </h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#334155;">
                ${greeting} we prepared a code so you can finish your verification on your phone. It expires at <strong>${expiryTime}</strong>.
              </p>

              <!-- Code block -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:#eef4ff;border:1px solid #c8ddff;border-radius:14px;">
                <tr>
                  <td align="center" style="padding:22px 16px;">
                    <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#2373F4;">
                      Your code
                    </p>
                    <p style="margin:0;font-family:Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:0.15em;color:#0f172a;">
                      ${escapeHtml(displayCode)}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:22px 0 14px;font-size:15px;line-height:1.65;color:#334155;">
                Or just tap the button below — it will open Dosnine on this device and take you straight to the next step.
              </p>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:10px;background:#2373F4;mso-padding-alt:14px 26px;">
                    <a href="${escapeHtml(verifyUrl)}" target="_blank" rel="noreferrer"
                      style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                      Continue verification
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#64748b;">
                If the button doesn't work, copy this link into your browser:<br>
                <a href="${escapeHtml(verifyUrl)}" style="color:#2373F4;word-break:break-all;">${escapeHtml(verifyUrl)}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 32px 22px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;line-height:1.6;color:#64748b;">
                If you didn't request this, you can safely ignore this email — the code expires in 30 minutes and won't verify anything on its own.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* --------------------------------------------------------------
 * Handler
 * -------------------------------------------------------------- */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Missing token' });
    }

    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not signed in' });
    }

    const db = getDbClient();

    const { data: session, error: loadErr } = await db
      .from('verification_sessions')
      .select(
        'id, token, short_code, user_clerk_id, status, expires_at, email_send_count, email_sent_at'
      )
      .eq('token', token)
      .maybeSingle();

    if (loadErr) {
      console.error('[send-email] load error:', loadErr);
      return res.status(500).json({ error: loadErr.message });
    }
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.user_clerk_id !== userId) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    if (!['pending', 'mobile_opened'].includes(session.status)) {
      return res.status(409).json({ error: 'Session is no longer active' });
    }
    if (new Date(session.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Session expired' });
    }

    // Rate limit: max 5 per session, min 60s between sends
    if ((session.email_send_count || 0) >= 5) {
      return res
        .status(429)
        .json({ error: 'You have reached the maximum emails for this code' });
    }
    if (session.email_sent_at) {
      const elapsed = Date.now() - new Date(session.email_sent_at).getTime();
      if (elapsed < 60_000) {
        return res
          .status(429)
          .json({ error: 'Please wait a minute before resending' });
      }
    }

    const clerkUser = await getClerkUser(userId);
    if (!clerkUser?.email) {
      return res
        .status(400)
        .json({ error: 'No email address on file for your account' });
    }

    // Build the verify URL for the email — one-click path
    const origin =
      req.headers.origin ||
      `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const verifyUrl = `${origin}/verify/mobile?t=${session.token}`;

    const brevoKey = process.env.BREVO_API_KEY;
    if (!brevoKey) {
      console.error('[send-email] BREVO_API_KEY missing');
      return res.status(500).json({ error: 'Email provider not configured' });
    }

    const html = buildEmailHtml({
      code: session.short_code,
      verifyUrl,
      expiresAt: session.expires_at,
      fullName: clerkUser.fullName,
    });

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: process.env.BREVO_SENDER_EMAIL || 'no-reply@dosnine.com',
          name: process.env.BREVO_SENDER_NAME || 'Dosnine',
        },
        to: [
          {
            email: clerkUser.email,
            name: clerkUser.fullName || undefined,
          },
        ],
        subject: `Your Dosnine verification code: ${session.short_code}`,
        htmlContent: html,
      }),
    });

    if (!brevoRes.ok) {
      const text = await brevoRes.text();
      console.error('[send-email] Brevo rejected:', brevoRes.status, text);
      return res
        .status(502)
        .json({ error: 'Email provider rejected the request' });
    }

    await db
      .from('verification_sessions')
      .update({
        email_sent_at: new Date().toISOString(),
        email_sent_to: clerkUser.email,
        email_send_count: (session.email_send_count || 0) + 1,
      })
      .eq('id', session.id);

    // Mask the email in the response so we don't leak it in logs
    const masked = clerkUser.email.replace(/^(.{2})[^@]*(@.*)$/, '$1***$2');

    return res.status(200).json({ success: true, sentTo: masked });
  } catch (err) {
    console.error('[send-email] unhandled:', err);
    return res
      .status(500)
      .json({ error: err?.message || 'Failed to send email' });
  }
}