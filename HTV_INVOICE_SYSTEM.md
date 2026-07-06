# HTV Orders Invoice Generation System

## ✨ Features Implemented

### 1. Invoice Component (`components/HtvInvoice.js`)
Professional invoice layout with:
- **Header**: Dosnine branding with invoice number (last 8 digits of UUID)
- **Contact Information**: From (Dosnine Ltd) and To (Customer)
- **Invoice Metadata**: Invoice date and order ID
- **Itemized Table**: Description, Quantity, Unit Price, Total
  - Main order details (size, color, rush status)
  - Delivery fees
  - Raw materials breakdown
- **Totals Section**: Subtotal, Delivery, Expenses, Total
- **Payment Instructions**:
  - NCB Account: Tahjay Thompson, #401337768
  - Scotiabank Account: Tahjay Thompson, Transit #50575, Savings Account
- **Notes Section**: Order-specific notes in yellow highlight
- **Footer**: Professional closing with company contact info

### 2. Invoice Generator (`lib/invoiceGenerator.js`)
Three functions for invoice export:
- **`generateInvoicePDF(invoiceElement, fileName)`** - Creates PDF via jsPDF & html2canvas
- **`generateInvoicePNG(invoiceElement, fileName)`** - Creates PNG image
- **`generateInvoicePreview(invoiceElement)`** - Generates preview thumbnail

### 3. Invoice API (`pages/api/admin/htv-invoice.js`)
- GET endpoint to fetch order data for invoice generation
- Admin authentication required
- Returns complete order details including raw materials

### 4. Dashboard Integration (`pages/admin/htv.js`)
New buttons on each expanded order:
- **📄 View Invoice** - Opens full-screen invoice modal
- **📥 PDF** - Downloads invoice as PDF file
- **📷 PNG** - Downloads invoice as PNG image

Modal features:
- Full invoice preview with scrolling
- Download buttons at bottom
- Close button to dismiss
- Loading state while generating files

## 🚀 How to Use

### 1. View Invoice for an Order
- Go to HTV Admin Dashboard (`/admin/htv`)
- Expand an order by clicking the chevron (▼)
- Click **📄 View Invoice** button
- Full invoice modal opens with all details

### 2. Download as PDF
- Click **📥 PDF** button on expanded order
- Browser downloads: `Invoice_[ORDERID]_[BUSINESSNAME].pdf`
- File opens/saves based on browser settings

### 3. Download as PNG
- Click **📷 PNG** button on expanded order
- Browser downloads: `Invoice_[ORDERID]_[BUSINESSNAME].png`
- High-resolution 2x scale for crisp printing

## 📋 Invoice Contents

Each invoice includes:
```
┌─────────────────────────────────┐
│  DOSNINE HEADER & INVOICE #     │
├─────────────────────────────────┤
│ FROM: Dosnine Ltd               │
│ 📧 dosnineco@gmail.com          │
│ 📱 876-336-9045                 │
│                                 │
│ TO: [Customer Business]         │
│ 📧 [Customer Email]             │
│ 📱 [Customer Phone]             │
├─────────────────────────────────┤
│ Invoice Date: [Date]            │
│ Order ID: [Last 8 Digits]       │
├─────────────────────────────────┤
│ Description  | Qty | Price | Total
│ Logo Cutting |  5  | 2500  | 12500
│ Delivery     |  1  |  700  | 700
│ Materials    |  -  | cost  | cost
├─────────────────────────────────┤
│ Subtotal: JMD 12500             │
│ Delivery: JMD 700               │
│ Expenses: JMD 1200              │
│ TOTAL: JMD 14200                │
├─────────────────────────────────┤
│ 🏦 PAYMENT INSTRUCTIONS         │
│ NCB: Account #401337768         │
│ Scotiabank: Account ending 0258 │
└─────────────────────────────────┘
```

## 📊 Data Included in Invoice

- **Order Details**: ID, Business Name, Phone, Email
- **Products**: Logo Size (3" or 6"), Color, Quantity
- **Pricing**: Subtotal, Delivery Fee, Total
- **Costs**: Raw Materials, Labor, Other Expenses
- **Status**: Current order status
- **Dates**: Invoice date, Order date
- **Notes**: Any special instructions

## 🔧 Technical Details

### Libraries Used
- **jsPDF**: PDF generation from HTML/canvas
- **html2canvas**: HTML to canvas conversion
- **React**: Component framework
- **Lucide Icons**: UI icons

### File Naming Convention
```
Invoice_[LAST_8_DIGITS_OF_UUID]_[BUSINESS_NAME_UNDERSCORED].[FORMAT]

Example: Invoice_A3F5B9C2_Dosnine_Ltd.pdf
```

### Invoice Number
- Uses last 8 characters of order UUID
- Uppercase format for readability
- Same for all export formats

## ✅ Quality Features

- **High DPI**: 2x scale for crisp printing
- **Professional Layout**: Clean, organized design
- **Color Coded**: Brand colors (orange #FF6B35)
- **Responsive**: Adapts to A4 paper size
- **Complete Data**: All financial and customer info
- **Payment Details**: Bank transfer information included
- **Error Handling**: User feedback via toast notifications

## 🎨 Invoice Styling

- **Colors**: Brand orange (#FF6B35) for headers
- **Fonts**: Arial for clean readability
- **Layout**: Two-column design for compact info
- **Tables**: Clear itemization with borders
- **Totals**: Highlighted with bold fonts
- **Sections**: Color-coded backgrounds (gray, yellow)

## 📱 Browser Compatibility

- **PDF Download**: Chrome, Firefox, Safari, Edge
- **PNG Download**: All modern browsers
- **Print to PDF**: Built-in browser functionality

## 🐛 Troubleshooting

### Invoice Modal Not Opening
- Verify order is expanded
- Check browser console for errors
- Refresh page and try again

### PDF Not Downloading
- Check pop-up blocker settings
- Ensure jsPDF/html2canvas loaded
- Try different browser

### PNG Quality Issues
- PDF is recommended for printing
- PNG is 2x resolution for screen use
- Check browser zoom level

### Missing Customer Email/Phone
- Fields show as-is from order
- Edit order to add missing info
- Regenerate invoice

## 🔐 Security

- Admin authentication required
- Order data never leaves server
- Client-side PDF/PNG generation
- No invoice data stored externally
- Follows existing security patterns

## 📞 Support

All invoice data comes from the HTV Orders table:
- Order ID: UUID
- Customer Info: business_name, email, phone
- Products: size, color, quantity, rush_order
- Pricing: subtotal, delivery_fee, total
- Costs: raw_materials, expenses
- Status: order status, creation date

For changes to invoice format, edit `components/HtvInvoice.js`
