# Queue Skip Incentive Feature

## Overview
Implemented a sophisticated queue-skipping incentive system using visual patterns similar to successful coupon/discount UI designs to encourage users to upgrade from free to premium service tiers.

## Features Added to VisitorEmailPopup.js

### 1. **Promo Code Input Section**
- Located above payment selection
- Input field with "Apply" button (inspired by the coupon code image)
- Supports promo codes: `SKIP10`, `QUICKSTART`, `RUSH`
- Visual feedback with green success state showing queue position

### 2. **Valid Promo Codes**
```javascript
'SKIP10': { discount: 10, bonusSpots: 1 }
'QUICKSTART': { discount: 15, bonusSpots: 2 }
'RUSH': { discount: 20, bonusSpots: 1 }
```

### 3. **Success State Design**
- Green checkmark icon that bounces
- Clear messaging showing queue position (1-5)
- Two messaging paths:
  - **Position #1-3**: "agents will contact you within 2 hours!"
  - **Position #4-5**: "expect contact within 24 hours!"

### 4. **Enhanced Free vs Premium Messaging**
- **Free Queue**: "Join the waitlist • 24-72 hour wait"
- **Premium**: "Skip the queue • Get matched in 2-4 hours"
- Shows "Promo Active" ribbon badge when code applied
- Added scarcity messaging: "{X} Spots Remaining!"

### 5. **Visual Differentiation**
| Element | Free | Premium |
|---------|------|---------|
| Color Scheme | Blue | Emerald Green |
| Wait Time | 24-72 hours | 2-4 hours |
| Icon | Search | Zap |
| Promo Badge | N/A | Shows when active |

### 6. **Button Copy Updates**
- Free: "Connect with [Type] Agent (24-72 hrs)"
- Premium: "Skip Queue - Get Matched in 2-4 Hours"
- Promo Applied: "Submit with Promo"

## User Journey

1. **Fill form** → Intent, budget, location details
2. **See promo prompt** → "Have a promo code? Apply it..."
3. **Enter promo** → Get instant positive feedback with green checkmark
4. **Choose payment** → 
   - Free (blue, longer wait)
   - Premium (green, quick match)
5. **Submit** → Clear CTA showing time savings

## Persuasion Techniques Used

✅ **Scarcity**: "7 Spots Remaining!" countdown  
✅ **Urgency**: Time-based differentiation (2-4 hrs vs 24-72 hrs)  
✅ **Social Proof**: Promo codes suggesting others are upgrading  
✅ **Visual Feedback**: Animated green checkmark on promo success  
✅ **Clear Value**: Explicit time savings messaging  
✅ **Gamification**: Queue position assignment (#1, #2, #3)  

## Configuration

To add new promo codes, edit the `VALID_PROMO_CODES` object:
```javascript
const VALID_PROMO_CODES = {
  'YOUR_CODE': { discount: 15, bonusSpots: 2 },
  // Add more codes here
};
```

## Analytics Recommended

Track:
- Promo code apply rate
- Promo to premium conversion
- Free vs premium selection rate
- Avg time from promo success to submission
- Queue position acceptance rates
