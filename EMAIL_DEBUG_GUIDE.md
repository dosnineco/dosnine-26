# Email Debug Guide - Course Preorder

## Issues Fixed

1. **❌ Fixed:** `replyTo` was set to user's email instead of sender's email
2. **✅ Added:** Better error logging with ✅/❌ emojis
3. **✅ Added:** Warning when `BREVO_API_KEY` is not set
4. **✅ Added:** Detailed error messages from Brevo API
5. **✅ Added:** Response includes `emailSent` status
6. **✅ Added:** Frontend logs email status

## How to Check if Emails are Working

### 1. Check Environment Variable

Make sure your `.env.local` file has:
```bash
BREVO_API_KEY=your_actual_brevo_api_key_here
```

**To verify:**
- Open your terminal in the project directory
- Run: `cat .env.local | grep BREVO`
- You should see your API key

### 2. Check Server Logs

When someone submits the form, look at your terminal where Next.js is running for:

**If API key is missing:**
```
⚠️ BREVO_API_KEY not set - email will not be sent
```

**If email sends successfully:**
```
✅ Confirmation email sent to: user@example.com
```

**If email fails:**
```
❌ Brevo email error: [detailed error message]
```

### 3. Test the Form

1. Go to `/course` page
2. Fill out the form with a real email (yours)
3. Submit the form
4. Check your terminal for the log messages above
5. Check your email inbox (and spam folder!)

### 4. Check Brevo Dashboard

1. Go to https://app.brevo.com
2. Login to your account
3. Navigate to **Transactional** → **Email Logs**
4. Look for recent emails sent to your test address
5. Check if they show as "Delivered", "Opened", or "Bounced"

## Common Issues

### Issue: "BREVO_API_KEY not set"
**Solution:** 
- Add your Brevo API key to `.env.local`
- Restart your Next.js dev server: `npm run dev`

### Issue: Email sends but doesn't arrive
**Possible causes:**
1. **Spam folder** - Check your spam/junk folder
2. **Invalid sender email** - Verify `dosnineco@gmail.com` is verified in Brevo
3. **Brevo account suspended** - Check your Brevo dashboard for warnings
4. **Daily limit exceeded** - Free Brevo accounts have sending limits

### Issue: "Invalid API key" error
**Solution:**
- Generate a new API key in Brevo
- Go to: Settings → API Keys → Generate a new API key
- Copy the key and update `.env.local`
- Restart the server

### Issue: Signup works but email fails
**Result:** 
- ✅ Signup is still saved to database
- ❌ Confirmation email not sent
- User will see success message
- Check server logs for the specific error

## Verify Brevo Setup

### 1. Check Sender Email
The sender email (`dosnineco@gmail.com`) must be:
- ✅ Verified in your Brevo account
- ✅ Have SPF/DKIM records set up (if using custom domain)
- ✅ Not on any blocklists

### 2. Verify in Brevo Dashboard
1. Go to **Senders & IPs** → **Senders**
2. Check if `dosnineco@gmail.com` shows as "Verified"
3. If not verified, click "Verify" and follow instructions

### 3. Check API Key Permissions
1. Go to **Settings** → **API Keys**
2. Find your API key
3. Make sure it has permission to "Send transactional emails"

## Testing Checklist

- [ ] `BREVO_API_KEY` is set in `.env.local`
- [ ] Next.js dev server has been restarted after adding key
- [ ] `dosnineco@gmail.com` is verified in Brevo
- [ ] Test form submission with your own email
- [ ] Check server terminal for log messages
- [ ] Check email inbox (and spam)
- [ ] Check Brevo dashboard for email logs
- [ ] Try a different email address (Gmail, Outlook, etc.)

## Manual Test Command

You can test the API endpoint directly with curl:

```bash
curl -X POST http://localhost:3000/api/preorder \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "your-email@example.com",
    "phone": "876-123-4567",
    "priceChoice": "JMD 15,000 — Full course",
    "buyNow": true,
    "discountedAmount": 10500
  }'
```

Expected successful response:
```json
{
  "success": true,
  "emailSent": true
}
```

If email fails:
```json
{
  "success": true,
  "emailSent": false,
  "emailError": "detailed error message"
}
```

## Need More Help?

If emails still aren't sending after checking all the above:

1. Share the exact error message from server logs
2. Verify your Brevo account status
3. Check if you've hit your Brevo sending limit
4. Try regenerating your API key in Brevo
5. Contact Brevo support if account issues persist
