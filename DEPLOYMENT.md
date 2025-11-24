# Deployment Guide — Production Ready

## Before Deployment Checklist

- [ ] All `.env.local` variables configured
- [ ] Supabase project created and SQL schema applied
- [ ] Clerk app created with correct keys
- [ ] Supabase Storage bucket `property-images` created and set to public
- [ ] Local testing complete (sign up, post property, browse, apply)
- [ ] Admin user role assigned to at least one user
- [ ] Landlord user role assigned to test accounts
- [ ] All images upload successfully
- [ ] Applications submit without errors

---

## Deploy to Vercel (Recommended)

### Step 1: Push to GitHub

```bash
cd /workspaces/dosnine-26
git add .
git commit -m "Add Rentals Jamaica platform"
git push origin main
```

### Step 2: Connect to Vercel

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "New Project"
4. Select `dosnine-26` repository
5. Click "Import"

### Step 3: Configure Environment Variables

In Vercel dashboard → Project Settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL = [your Supabase URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [your Supabase anon key]
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = [your Clerk publishable key]
CLERK_SECRET_KEY = [your Clerk secret key]
```

### Step 4: Update Clerk Redirect URIs

In Clerk dashboard → Applications → Settings → URLs:

**Add Allowed redirect URLs:**
```
https://your-domain.vercel.app
https://your-domain.vercel.app/sign-in
https://your-domain.vercel.app/sign-up
https://your-domain.vercel.app/property/*
https://your-domain.vercel.app/landlord/*
https://your-domain.vercel.app/admin/*
```

**Add Allowed sign out URLs:**
```
https://your-domain.vercel.app
```

### Step 5: Deploy

In Vercel, click "Deploy" → Wait for build to complete ✅

---

## Configure Custom Domain (Optional)

### In Vercel:
1. Project → Settings → Domains
2. Add your custom domain (e.g., rentaljamaica.com)
3. Follow DNS configuration steps

### Update Clerk URIs:
Change all Vercel redirect URLs to your custom domain:
```
https://rentaljamaica.com
https://rentaljamaica.com/sign-in
...
```

---

## Enable Security (Row-Level Security)

### In Supabase Dashboard:

1. Go to Authentication → Policies

2. **Enable RLS on all tables:**

```sql
-- For properties table
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Landlords can only see/edit their own properties
CREATE POLICY "Users can see all properties" ON properties
  FOR SELECT USING (true);

CREATE POLICY "Owners can edit own properties" ON properties
  FOR UPDATE USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own properties" ON properties
  FOR DELETE USING (auth.uid() = owner_id);

-- For applications table
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create application" ON applications
  FOR INSERT WITH CHECK (true);

-- For tenancies table
ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage tenancies" ON tenancies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = tenancies.property_id 
      AND properties.owner_id = auth.uid()
    )
  );
```

---

## Set Up Email Notifications (Optional)

### Install email service (e.g., SendGrid, Resend)

```bash
yarn add resend  # or sendgrid
```

### Create API route for emails

**pages/api/send-email.js:**

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html } = req.body;

  try {
    // Example with Resend
    // const { data, error } = await resend.emails.send({
    //   from: 'noreply@rentaljamaica.com',
    //   to,
    //   subject,
    //   html
    // });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
}
```

### Send email on application submission

In **pages/property/[slug].js**, after form submission:

```javascript
// Send notification to landlord
await fetch('/api/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: landlord_email,
    subject: `New application for ${property.title}`,
    html: `<p>New rental application from ${applicationForm.full_name}</p>`
  })
});
```

---

## Monitor Production

### Vercel Logs
- Dashboard → Deployments → Select deployment → Logs
- Check for errors in real-time

### Supabase Logs
- Dashboard → Logs → View database queries
- Check Storage for upload issues

### Clerk Logs
- Dashboard → Logs → View authentication events

---

## Performance Optimization

### 1. Enable Caching

In **next.config.js**, add:

```javascript
module.exports = {
  reactStrictMode: true,
  images: {
    domains: ['your-supabase-storage-url'],
    unoptimized: false, // Optimize images
  },
  // Cache static pages
  staticPageGenerationTimeout: 300,
};
```

### 2. Add Image Optimization

Update **pages/property/[slug].js**:

```javascript
import Image from 'next/image';

// Replace <img> with <Image>
<Image
  src={currentImage}
  alt={property.title}
  width={800}
  height={600}
  priority
/>
```

### 3. Disable ISR for Static Pages

For high-traffic properties, set `revalidate: false` instead of 60.

---

## Troubleshooting Deployment

### Build fails with "Cannot find module"
```bash
# Clear cache and rebuild
vercel env pull
vercel deploy --prod
```

### Clerk redirects not working
- Verify all Vercel URLs are added to Clerk
- Clear browser cache and cookies
- Wait 5 minutes for DNS to propagate

### Supabase connection fails
- Test connection string in Supabase SQL editor
- Verify IP whitelist (if set)
- Check anon key hasn't changed

### Images not loading
- Verify storage bucket is public
- Check image URLs in database
- Confirm Supabase Storage domain in CORS settings

---

## Ongoing Maintenance

### Daily
- Monitor Vercel deployment logs
- Check Supabase for database errors

### Weekly
- Review user applications
- Verify payments (if implementing)
- Check property listings for updates

### Monthly
- Clean up old/abandoned listings
- Review admin dashboard
- Test backup procedures

### Quarterly
- Update dependencies: `yarn upgrade`
- Review security logs
- Plan feature updates

---

## Scaling Considerations

**When you reach:**

- **100 properties** → Enable Supabase caching layer
- **1,000 properties** → Optimize search with full-text search
- **10,000 users** → Consider database replication
- **100K requests/day** → Enable Vercel Edge caching

---

## Support Resources

- **Vercel:** https://vercel.com/docs
- **Supabase:** https://supabase.com/docs
- **Clerk:** https://clerk.com/docs
- **Next.js:** https://nextjs.org/docs

---

## Deployment Completion Checklist

After deployment:

- [ ] Verify site loads at custom domain
- [ ] Test sign-in/sign-up flow
- [ ] Create test property as landlord
- [ ] Apply for property as renter
- [ ] Check admin dashboard access
- [ ] Verify images load from Supabase Storage
- [ ] Test email notifications (if set up)
- [ ] Monitor error logs for 24 hours
- [ ] Share URL with stakeholders
- [ ] Plan marketing/launch announcement

---

🎉 **Congratulations!** Your rental platform is now live!
