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

    // Send confirmation emails to both user and admin
    if (!BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY not set - emails will not be sent')
      return res.status(201).json({ success: true, emailSent: false })
    }

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
    apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY)

    let userEmailSent = false
    let adminEmailSent = false
    let emailErrors = []

    // 1. Send confirmation email to USER
    try {
      const userEmail = new SibApiV3Sdk.SendSmtpEmail()
      userEmail.subject = '🎉 Your Dosnine Course Spot is Reserved!'
      userEmail.sender = { name: BREVO_FROM_NAME, email: BREVO_FROM_EMAIL }
      userEmail.to = [{ email, name }]
      userEmail.replyTo = { email: BREVO_FROM_EMAIL, name: BREVO_FROM_NAME }
      userEmail.htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" cellpadding="0" cellspacing="0">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎉 Spot Reserved!</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px; font-size: 16px; color: #0f172a; line-height: 1.6;">Hi ${name},</p>
                      
                      <p style="margin: 0 0 20px; font-size: 16px; color: #0f172a; line-height: 1.6;">
                        Thank you for reserving your spot in the <strong>Dosnine Course</strong>! Your signup has been confirmed.
                      </p>

                      <!-- Next Steps -->
                      <div style="background-color: #f1f5f9; border-left: 4px solid #4f46e5; padding: 20px; margin: 30px 0; border-radius: 4px;">
                        <h2 style="margin: 0 0 15px; font-size: 18px; color: #0f172a;">📋 What Happens Next</h2>
                        <ol style="margin: 0; padding-left: 20px; color: #475569; line-height: 1.8;">
                          <li style="margin-bottom: 10px;">We'll contact you via <strong>WhatsApp within 24 hours</strong> with payment details</li>
                          <li style="margin-bottom: 10px;">Complete payment to secure your <strong>lifetime access</strong></li>
                          <li>Get <strong>instant course access</strong> after payment confirmation</li>
                        </ol>
                      </div>

                      <!-- Price Info -->
                      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 25px; margin: 30px 0; border-radius: 8px; text-align: center;">
                        <p style="margin: 0 0 10px; font-size: 14px; color: #d1fae5; font-weight: 600; text-transform: uppercase;">Your Price</p>
                        <p style="margin: 0; font-size: 36px; color: #ffffff; font-weight: bold;">JMD ${discountedAmount ? discountedAmount.toLocaleString() : '10,500'}</p>
                        ${buyNow ? '<p style="margin: 10px 0 0; font-size: 14px; color: #d1fae5; font-weight: 600;">⚡ BUY NOW SELECTED - Priority Processing!</p>' : ''}
                      </div>

                      <!-- Course Details -->
                      <div style="background-color: #eff6ff; padding: 20px; margin: 30px 0; border-radius: 8px; border: 1px solid #bfdbfe;">
                        <p style="margin: 0 0 10px; font-size: 14px; color: #1e40af; font-weight: 600;">📚 What You'll Get:</p>
                        <ul style="margin: 0; padding-left: 20px; color: #1e3a8a; line-height: 1.8;">
                          <li>Complete course curriculum with lifetime access</li>
                          <li>Step-by-step video tutorials</li>
                          <li>Downloadable resources & templates</li>
                          <li>Community support</li>
                        </ul>
                      </div>

                      <!-- Support -->
                      <div style="background-color: #fef3c7; border: 1px solid #fbbf24; padding: 20px; margin: 30px 0; border-radius: 8px;">
                        <p style="margin: 0 0 10px; font-size: 14px; color: #92400e; font-weight: 600;">💬 Need Help?</p>
                        <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.6;">
                          Questions? Reply to this email or WhatsApp us at <strong>+1 876 336 9045</strong>
                        </p>
                      </div>

                      <p style="margin: 30px 0 0; font-size: 16px; color: #0f172a; line-height: 1.6;">
                        We're excited to have you join us!<br><br>
                        <strong>Best regards,</strong><br>
                        The Dosnine Team
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0; font-size: 12px; color: #64748b;">
                        © 2026 Dosnine. Build real products. Launch. Get paid.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `

      await apiInstance.sendTransacEmail(userEmail)
      userEmailSent = true
      console.log('✅ User confirmation email sent to:', email)
    } catch (userEmailError) {
      console.error('❌ User email error:', userEmailError?.response?.body || userEmailError?.message)
      emailErrors.push({ type: 'user', error: userEmailError?.response?.body?.message || 'Failed to send user email' })
    }

    // 2. Send notification email to ADMIN
    try {
      const adminEmail = new SibApiV3Sdk.SendSmtpEmail()
      adminEmail.subject = `🔔 New Course Signup: ${name}`
      adminEmail.sender = { name: 'Dosnine System', email: BREVO_FROM_EMAIL }
      adminEmail.to = [{ email: BREVO_FROM_EMAIL, name: 'Dosnine Admin' }]
      adminEmail.replyTo = { email: email, name: name }
      adminEmail.htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" cellpadding="0" cellspacing="0">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">🔔 New Course Signup</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px;">
                      <p style="margin: 0 0 20px; font-size: 16px; color: #0f172a; font-weight: 600;">You have a new course signup!</p>
                      
                      <!-- Customer Details -->
                      <div style="background-color: #f1f5f9; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10b981;">
                        <h2 style="margin: 0 0 15px; font-size: 16px; color: #0f172a; font-weight: 600;">👤 Customer Details</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 8px 0; font-size: 14px; color: #64748b; width: 120px;">Name:</td>
                            <td style="padding: 8px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${name}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Email:</td>
                            <td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${email}" style="color: #4f46e5; text-decoration: none;">${email}</a></td>
                          </tr>
                          ${phone ? `
                          <tr>
                            <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Phone:</td>
                            <td style="padding: 8px 0; font-size: 14px;"><a href="tel:${phone}" style="color: #4f46e5; text-decoration: none;">${phone}</a></td>
                          </tr>
                          ` : ''}
                          <tr>
                            <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Price Choice:</td>
                            <td style="padding: 8px 0; font-size: 14px; color: #0f172a;">${priceChoice || 'Not specified'}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Buy Now:</td>
                            <td style="padding: 8px 0; font-size: 14px;">
                              ${buyNow ? '<span style="background-color: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">⚡ YES</span>' : '<span style="color: #64748b;">No</span>'}
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- Amount -->
                      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
                        <p style="margin: 0 0 8px; font-size: 12px; color: #e0e7ff; text-transform: uppercase; font-weight: 600;">Expected Amount</p>
                        <p style="margin: 0; font-size: 32px; color: #ffffff; font-weight: bold;">JMD ${discountedAmount ? discountedAmount.toLocaleString() : '0'}</p>
                      </div>

                      <!-- Action Required -->
                      <div style="background-color: #fef3c7; border: 1px solid #fbbf24; padding: 20px; margin: 20px 0; border-radius: 8px;">
                        <p style="margin: 0 0 10px; font-size: 14px; color: #92400e; font-weight: 600;">⚡ Action Required:</p>
                        <ol style="margin: 0; padding-left: 20px; color: #78350f; line-height: 1.8; font-size: 14px;">
                          <li>Contact customer via WhatsApp: <strong>${phone || 'No phone provided'}</strong></li>
                          <li>Send payment details</li>
                          <li>Confirm payment in admin dashboard</li>
                          <li>Grant course access</li>
                        </ol>
                      </div>

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="https://dosnine.com/admin/course" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                          View in Dashboard →
                        </a>
                      </div>

                      <p style="margin: 20px 0 0; font-size: 12px; color: #64748b; text-align: center;">
                        Signup received on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `

      await apiInstance.sendTransacEmail(adminEmail)
      adminEmailSent = true
      console.log('✅ Admin notification email sent')
    } catch (adminEmailError) {
      console.error('❌ Admin email error:', adminEmailError?.response?.body || adminEmailError?.message)
      emailErrors.push({ type: 'admin', error: adminEmailError?.response?.body?.message || 'Failed to send admin email' })
    }

    // Return response with email status
    return res.status(201).json({ 
      success: true, 
      emailSent: userEmailSent || adminEmailSent,
      userEmailSent,
      adminEmailSent,
      emailErrors: emailErrors.length > 0 ? emailErrors : undefined
    })

  } catch (err) {
    console.error('❌ Preorder error:', err)
    return res.status(500).json({ error: 'Internal error', details: err.message })
  }
}
