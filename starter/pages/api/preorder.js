import { supabase } from '../../lib/supabase'
import * as SibApiV3Sdk from '@getbrevo/brevo'

const BREVO_API_KEY = process.env.BREVO_API_KEY || ''
const BREVO_FROM_EMAIL = 'dosnineco@gmail.com'
const BREVO_FROM_NAME = 'Dosnine'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, email, phone, priceChoice, buyNow, discountedAmount } = req.body || {}
  if (!name || !email) return res.status(400).json({ error: 'Missing required fields' })

  try {
    const entry = {
      name,
      email,
      phone: phone || null,
      price_choice: priceChoice || null,
      buy_now: !!buyNow,
      discounted_amount: discountedAmount || 0
    }

    const { error } = await supabase.from('course_preorders').insert(entry)
    if (error) throw error

    if (BREVO_API_KEY) {
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
      apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY)

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
      sendSmtpEmail.subject = 'Dosnine Course preorder confirmed'
      sendSmtpEmail.sender = { name: BREVO_FROM_NAME, email: BREVO_FROM_EMAIL }
      sendSmtpEmail.to = [{ email }]
      sendSmtpEmail.replyTo = { email }
      sendSmtpEmail.textContent = `Hi ${name},\n\nYour spot for the Dosnine Course is secured. We will contact you with next steps shortly.\n\nThanks,\nDosnine Team`
      sendSmtpEmail.htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #0f172a;">
          <h2 style="margin: 0 0 12px;">Your Dosnine Course spot is secured</h2>
          <p style="margin: 0 0 12px;">Hi ${name},</p>
          <p style="margin: 0 0 12px;">Your spot for the Dosnine Course is secured. We will contact you with next steps shortly.</p>
          <p style="margin: 0;">Thanks,<br />Dosnine Team</p>
        </div>
      `

      try {
        await apiInstance.sendTransacEmail(sendSmtpEmail)
      } catch (sendError) {
        console.error('brevo error', sendError)
      }
    }

    return res.status(201).json({ success: true })
  } catch (err) {
    console.error('preorder error', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
