# Dosnine Design System

This document outlines the standardized button and text styles used across the Dosnine platform.

## Button Classes

All buttons across the site now use consistent, reusable classes defined in `styles/globals.css`.

### Primary Button
**Class:** `.btn-primary` or `.btn-accent`
- **Usage:** Main call-to-action buttons
- **Style:** Accent red background (#F55353), white text
- **Examples:** "Update Results", "Post Property", "WhatsApp"
```jsx
<button className="btn-primary">Submit</button>
```

### Secondary Button
**Class:** `.btn-secondary`
- **Usage:** Less prominent actions
- **Style:** Gray background (#6B7280), white text
- **Examples:** "Delete", "Cancel"
```jsx
<button className="btn-secondary">Delete</button>
```

### Outline Button
**Class:** `.btn-outline` or `.btn-accent-outline`
- **Usage:** Secondary actions, alternatives
- **Style:** Transparent background, accent border, accent text
- **Examples:** "Maybe Later", "Back", "Call Landlord"
```jsx
<button className="btn-outline">Cancel</button>
```

### Button Sizes

#### Default Size
- Padding: 0.5rem 1rem (8px 16px)
- Font size: 0.875rem (14px)
- Use with just `.btn-primary`, `.btn-secondary`, or `.btn-outline`

#### Large Button
**Class:** `.btn-lg`
- Padding: 0.75rem 1.5rem (12px 24px)
- Font size: 1rem (16px)
- **Usage:** Important CTAs, prominent actions
```jsx
<button className="btn-primary btn-lg">Unlock Access - $50 USD</button>
```

#### Small Button
**Class:** `.btn-sm`
- Padding: 0.375rem 0.75rem (6px 12px)
- Font size: 0.813rem (13px)
- **Usage:** Compact spaces, secondary actions in lists
```jsx
<button className="btn-primary btn-sm">View Details</button>
```

## Button Features

### Built-in Features
All button classes include:
- **Display:** `inline-flex` with centered content
- **Gap:** 0.375rem (6px) between icon and text
- **Border Radius:** 0.5rem (8px)
- **Transition:** 150ms ease-in-out for all properties
- **Hover Effect:** Slight lift with `translateY(-1px)` and color darkening
- **Focus Ring:** Accent color shadow for accessibility
- **Disabled State:** 60% opacity, no hover effects, not-allowed cursor

### With Icons
Buttons automatically space icons properly:
```jsx
<button className="btn-primary">
  <FiZap size={16} />
  Boost Property
</button>
```

### Full Width
Combine with Tailwind's `w-full`:
```jsx
<button className="w-full btn-primary">Submit Form</button>
```

## Text Utilities

### Text Sizes
- `.text-xs`: 0.75rem (12px) - Fine print, captions
- `.text-sm`: 0.875rem (14px) - Body text, labels
- `.text-base`: 1rem (16px) - Standard body
- `.text-lg`: 1.125rem (18px) - Subheadings
- `.text-xl`: 1.25rem (20px) - Section titles
- `.text-2xl`: 1.5rem (24px) - Page headings
- `.text-3xl`: 1.875rem (30px) - Hero text

### Font Weights
- `.font-normal`: 400 - Regular text
- `.font-medium`: 500 - Slightly emphasized
- `.font-semibold`: 600 - Strong emphasis
- `.font-bold`: 700 - Headings, important text

### Accent Color
- `.text-accent`: #F55353 (accent red)
- `.bg-accent`: #F55353 background
- `.border-accent`: #F55353 border

## Implementation Status

### ✅ Completed Pages
- [x] Homepage (`pages/index.js`)
- [x] Property Detail (`pages/property/[slug].js`)
- [x] Contact Page (`pages/contact.js`)
- [x] Search Results (`pages/search/[...slug].js`)
- [x] Agent Dashboard (`pages/agent/dashboard.js`)
- [x] Landlord Dashboard (`pages/landlord/dashboard.js`)
- [x] New Property Form (`pages/landlord/new-property.js`)
- [x] Boost Property (`pages/landlord/boost-property.js`)
- [x] Admin Dashboard (`pages/admin/dashboard.js`)
- [x] Header Component (`components/Header.js`)
- [x] Visitor Email Popup (`components/VisitorEmailPopup.js`)

### Design Principles

1. **Consistency:** All buttons use the same base styles
2. **Hierarchy:** Size and color indicate importance
3. **Accessibility:** Focus states and disabled states clearly visible
4. **Responsiveness:** Classes work on all screen sizes
5. **Flexibility:** Combine with Tailwind utilities as needed

### Migration Notes

**Before:**
```jsx
<button className="bg-accent px-8 py-3 text-lg font-bold rounded-lg hover:bg-accent/90">
  Submit
</button>
```

**After:**
```jsx
<button className="btn-primary btn-lg">
  Submit
</button>
```

This reduces code duplication and ensures visual consistency across the entire application.
