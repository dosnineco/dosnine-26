# 📦 Bulk Listing Creator

## Overview
A phone-optimized bulk listing creator that lets verified agents upload 10+ property listings in ~2 minutes.

## Key Features

✅ **Single Page, No Reloads** - Everything happens on one screen  
✅ **Phone-Optimized** - Works perfectly on basic phone browsers  
✅ **Batch Creation** - One form creates many listings  
✅ **Fast Input** - Table-like rows for quick data entry  
✅ **Mass Photo Upload** - Select all photos at once, auto-distribute  
✅ **Template System** - Save and reuse common configurations  

## How It Works

### Step 1: Base Listing (30 seconds)
Fill in common fields once:
- Property Type (apartment, house, condo, etc.)
- Parish
- Bedrooms
- Bathrooms
- Listing Type (rent/sale)
- Description template with variables

### Step 2: Add Variations (60 seconds)
Add rows in a simple table:
- Area/Town
- Price
- Notes (optional)

Each row = one listing. Add 10 rows = 10 listings.

### Step 3: Mass Photo Upload (30 seconds)
- Select all photos at once from gallery
- Choose photos per listing (3, 5, 8, or 10)
- System auto-assigns photos in order

### Step 4: Publish All (instant)
One tap publishes all listings with:
- Base data applied to all
- Row variations applied individually
- Photos distributed automatically

## Access

**Route**: `/properties/bulk-create`

**Requirements**: Must be a verified agent (verification_status = 'approved')

**Navigation**: Available in header for verified agents as "📦 Bulk Create"

## Template System

### Save Template
Click "💾 Save Template" to save current base configuration:
- Property type, parish, bedrooms, bathrooms
- Description template
- Photos per listing preference

### Load Template
Click "📋 Templates" to view and load saved templates:
- Quick access to common configurations
- Examples: "Portmore Apartments", "Kingston Townhouses"
- One-click to apply

### Template Storage
Templates are stored in browser localStorage (client-side only).

## Technical Details

### Database
Uses existing `properties` table with fields:
- `owner_id` - Links to user
- `slug` - Auto-generated from title
- `title` - Generated as "{bedrooms} Bedroom {type} - {area}"
- `description` - Template with variables replaced
- `parish` - Normalized parish name
- `town` - From row's "area" field
- `bedrooms`, `bathrooms` - From base data
- `price` - From row data
- `type` - From base data
- `image_urls` - Array of uploaded photo URLs

### Photo Upload
- Uses Supabase Storage bucket `property-images`
- Path: `{property_id}/{timestamp}-{position}.{ext}`
- Public URLs stored in `image_urls` array
- Photos distributed sequentially across listings

### Variable Substitution
Description template supports:
- `{{area}}` - Replaced with row's area/town
- `{{bedrooms}}` - Replaced with base bedrooms
- `{{bathrooms}}` - Replaced with base bathrooms

Example:
```
Template: "Spacious {{bedrooms}} bedroom unit in {{area}}. Close to amenities."
Row: { area: "Portmore", price: "120000" }
Result: "Spacious 2 bedroom unit in Portmore. Close to amenities."
```

## Performance

**Target**: 10 listings in 2 minutes

**Breakdown**:
- Base listing: 30 seconds
- 10 rows: 60 seconds (6 seconds per row)
- Photos: 30 seconds
- Publishing: Instant (background processing)

**Upload Speed**: Processes sequentially to avoid rate limits and ensure data integrity.

## Mobile Optimization

### No Friction Points
- No modals or pop-ups
- No page navigation
- No individual photo uploads
- No repeated form fields
- No confirmation dialogs

### Phone-Friendly Design
- Large touch targets
- Minimal scrolling
- Simple table layout
- Clear visual feedback
- Sticky publish button at bottom

## Future Enhancements

**Potential additions** (not implemented):
- CSV import for bulk data
- Photo templates (reuse photo sets)
- Bulk editing of existing listings
- Analytics per batch
- Draft saving
- Team collaboration

## Files

### Component
`/starter/components/BulkListingCreator.js`

### Page
`/starter/pages/properties/bulk-create.js`

### Navigation
Updated in `/starter/components/Header.js`

## Usage Example

Agent posts 10 Portmore apartments:

1. **Base**: 
   - Type: Apartment
   - Parish: St Catherine
   - Bedrooms: 2
   - Bathrooms: 1
   - Description: "Modern 2 bedroom apartment in {{area}}"

2. **Rows**:
   ```
   #  Area              Price    Notes
   1  Portmore Central  120,000  Ground floor
   2  Portmore Central  125,000  Upper unit
   3  Waterford         130,000  With balcony
   4  Independence City 115,000  Gated community
   5  Gregory Park      110,000  Near plaza
   ... (5 more)
   ```

3. **Photos**: 
   - Select 50 photos (5 per listing)
   - Auto-distributed: 1-5 → Listing 1, 6-10 → Listing 2, etc.

4. **Publish**: 
   - One tap creates 10 listings
   - Redirects to "My Listings"

## Notes

- Only verified agents can access
- Requires existing user record in database
- Photos must be selected before publishing
- System warns if insufficient photos
- All listings set to "available" status
- Phone number from base data applied to all

---

**Built for speed, optimized for phones, designed for practical use.**
