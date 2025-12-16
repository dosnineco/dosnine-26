# Property Boost Advertising System

## Overview
The Property Boost system allows landlords to promote their properties with featured placement for increased visibility. Boosted properties appear in a rotating banner on every page of the site.

## Features

### 1. **Boost Queue Management**
- Maximum 20 active boosts at any time
- First-come, first-served basis
- When queue is full, shows next available date
- Automatic expiration after 10 days

### 2. **Pricing**
- **Cost:** JMD $2,500 (~$25 USD) per boost
- **Duration:** 10 days
- **Payment:** PayPal integration

### 3. **Rotation System**
- Boosts rotate every 10 minutes
- Fair distribution among all active boosts
- Tracks impressions (views) and clicks
- Progress bar shows time until next rotation

### 4. **Analytics Tracking**
- Impressions: Number of times banner was shown
- Clicks: Number of clicks to property
- Rotation count: How many times property appeared
- Last shown timestamp

### 5. **Search Weighting**
- Boosted properties automatically prioritized in search results
- Properties sorted by: `is_featured DESC, created_at DESC`
- Featured badge displayed on property cards

## Database Schema

### `property_boosts` Table
```sql
CREATE TABLE property_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
  payment_id text NOT NULL,
  amount numeric NOT NULL DEFAULT 2500,
  currency text DEFAULT 'JMD',
  boost_start_date timestamptz NOT NULL,
  boost_end_date timestamptz NOT NULL,
  status text DEFAULT 'active', -- active | expired | cancelled
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  last_shown_at timestamptz,
  rotation_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

### Indexes
- `property_boosts_status_idx` on status
- `property_boosts_dates_idx` on (boost_start_date, boost_end_date)
- `property_boosts_property_id_idx` on property_id

## Files Created

### Pages
1. **`/landlord/boost-property.js`** - Boost purchase page
   - Select property to boost
   - Check availability (max 20 slots)
   - PayPal payment integration
   - Shows existing active boosts
   - Queue management and next available date

### Components
2. **`/components/BoostedPropertyBanner.js`** - Rotating ad banner
   - Displays on all pages via `_app.js`
   - 10-minute rotation cycle
   - Tracks impressions and clicks
   - Smooth animations and transitions
   - Mobile responsive design
   - Closeable (stores preference in localStorage)

### API Routes
3. **`/api/cleanup-expired-boosts.js`** - Cleanup endpoint
   - Marks expired boosts as 'expired'
   - Removes featured flag from properties
   - Can be called via cron job

### Updated Files
4. **`pages/index.js`** - Enhanced search
   - Added location search with partial matching
   - Searches across town, address, and parish
   - Uses PostgreSQL ILIKE for fuzzy matching

5. **`pages/_app.js`** - Added banner
   - BoostedPropertyBanner component added globally
   - Appears on all pages

6. **`pages/landlord/dashboard.js`** - Added boost button
   - Yellow "Boost" button on each property
   - Links to boost purchase page

7. **`supabase.sql`** - Database schema
   - Added property_boosts table
   - Added necessary indexes

## How It Works

### User Flow
1. **Landlord** navigates to Dashboard
2. Clicks **"Boost"** button on any property
3. Redirected to `/landlord/boost-property`
4. System checks if queue has available slots (max 20)
5. If available, landlord selects property and pays via PayPal
6. Upon successful payment:
   - `property_boosts` record created
   - Property marked as `is_featured = true`
   - Boost becomes active immediately
7. Property appears in rotating banner on all pages
8. After 10 days, boost expires automatically

### Banner Rotation Logic
```javascript
// Every 10 minutes (600,000ms)
1. Fetch all active boosts (status='active', end_date > now)
2. Order by last_shown_at (nulls first)
3. Select first boost (least recently shown)
4. Display in banner
5. Update: last_shown_at, rotation_count++, impressions++
6. On click: clicks++
```

### Queue Management
```javascript
// When landlord tries to boost
1. Count active boosts: SELECT COUNT(*) FROM property_boosts 
   WHERE status='active' AND boost_end_date >= now()
2. If count < 20: Allow boost purchase
3. If count >= 20: Show "Queue Full" message
   - Calculate next available date from earliest expiring boost
   - Display: "Next available: [date]"
```

## Enhanced Search Features

### Partial Location Matching
Users can search with partial text that matches:
- **Parish**: "St And" finds "St Andrew"
- **Town**: "Half Way" finds "Half Way Tree"
- **Address**: "Hope Road" finds any property on Hope Road

```sql
-- Search query example
WHERE town ILIKE '%half way%' 
   OR address ILIKE '%half way%' 
   OR parish ILIKE '%half way%'
```

### Search Weighting
Properties are sorted by:
1. **Featured first** (`is_featured = true`)
2. **Most recent** (`created_at DESC`)

This ensures boosted properties appear at the top of search results.

## Cron Job Setup (Optional)

To automatically clean up expired boosts, set up a cron job or scheduled task:

### Vercel Cron (vercel.json)
```json
{
  "crons": [
    {
      "path": "/api/cleanup-expired-boosts",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### Manual Call
```bash
curl -X POST https://yoursite.com/api/cleanup-expired-boosts
```

## Analytics & Reporting

Landlords can view boost performance on their dashboard:
- **Active boosts** with end dates
- **Impressions**: Total banner views
- **Clicks**: Total clicks to property
- **CTR**: Click-through rate

Future enhancement: Detailed analytics page showing:
- Daily impressions/clicks graph
- Comparison with non-boosted performance
- ROI calculator

## Business Rules

### Queue Limits
- **Maximum active boosts**: 20
- **Reason**: Fair visibility for all advertisers, prevents banner fatigue
- **Rotation frequency**: 10 minutes
- **Average impressions per property per hour**: 6 (60min / 10min)

### Pricing Strategy
- **JMD $2,500** (~$25 USD) for 10 days
- **Daily cost**: JMD $250 (~$2.50 USD)
- **Estimated impressions**: ~1,440 over 10 days (6/hour * 24 hours * 10 days / 20 properties)

### Refund Policy
Boosts can be cancelled with pro-rated refund:
```javascript
const daysRemaining = (boost_end_date - now) / (1000 * 60 * 60 * 24);
const refundAmount = (2500 / 10) * daysRemaining;
```

## Testing Checklist

- [ ] Purchase boost with PayPal test account
- [ ] Verify property marked as featured
- [ ] Check banner displays on multiple pages
- [ ] Confirm 10-minute rotation works
- [ ] Test impressions/clicks tracking
- [ ] Verify queue limit (try boosting 21st property)
- [ ] Test "Next available date" when queue full
- [ ] Run cleanup API to expire old boosts
- [ ] Check featured flag removed after expiration
- [ ] Test partial location search
- [ ] Verify boosted properties appear first in search

## Future Enhancements

1. **Email Notifications**
   - Boost activation confirmation
   - 2 days before expiration reminder
   - Expiration notice

2. **Advanced Analytics Dashboard**
   - Hourly/daily breakdown
   - Conversion tracking (applications from boosted listings)
   - A/B testing different banner designs

3. **Boost Packages**
   - 5 days: JMD $1,500
   - 10 days: JMD $2,500 (current)
   - 30 days: JMD $6,000 (20% discount)

4. **Priority Boost Tiers**
   - Standard: 10-minute rotation (current)
   - Premium: 5-minute rotation (+50% cost)
   - Elite: Always visible sidebar (+100% cost)

5. **Geographic Targeting**
   - Boost only in specific parishes
   - Target users searching in certain areas

## Support & Troubleshooting

### Boost Not Appearing?
1. Check boost status in database: `SELECT * FROM property_boosts WHERE property_id = '...'`
2. Verify end date hasn't passed: `boost_end_date > now()`
3. Check if property is marked featured: `SELECT is_featured FROM properties WHERE id = '...'`
4. Clear localStorage: `localStorage.removeItem('boostBannerHidden')`

### Payment Successful but Boost Not Active?
1. Check PayPal webhook logs
2. Verify `property_boosts` record created
3. Check `payment_id` matches PayPal order ID
4. Manually update if needed:
```sql
UPDATE property_boosts 
SET status = 'active' 
WHERE payment_id = 'PAYPAL_ORDER_ID';
```

### Queue Always Full?
Run cleanup manually:
```bash
curl -X POST https://yoursite.com/api/cleanup-expired-boosts
```

Or check for stuck boosts:
```sql
SELECT * FROM property_boosts 
WHERE status = 'active' 
AND boost_end_date < now();
```

## Contact & Support

For technical issues or feature requests, contact the development team or file an issue in the repository.
