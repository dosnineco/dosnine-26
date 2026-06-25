# Image Editing Feature Setup

## ⚠️ Requirements

**IMPORTANT:** Your OpenAI account MUST have access to image generation models. This is NOT available by default.

### Prerequisites
1. **Active OpenAI Account** with billing enabled
2. **Payment Method** on file (required for image generation)
3. **API Access** to DALL-E 2 or DALL-E 3

### Verify Access

To check if your account has image generation access:

1. Go to https://platform.openai.com/account/billing/overview
2. Verify you have a **valid payment method**
3. Go to https://platform.openai.com/docs/models and look for:
   - `dall-e-3` (preferred, $0.040 per 512x512 image)
   - `dall-e-2` (fallback, $0.018 per 512x512 image)

**If you don't see these models:**
- Add a payment method to your OpenAI account
- Wait 24 hours for the changes to take effect
- Image generation access may be restricted in some regions

## Setup Instructions

### 1. Get OpenAI API Key
1. Go to [OpenAI API Keys page](https://platform.openai.com/api-keys)
2. Sign in with your OpenAI account (create one if needed)
3. Click "Create new secret key"
4. Copy the key

### 2. Add to Environment
Add the following to your `.env.local` file in the `/starter` folder:
```
OPENAI_API_KEY=sk-your-api-key-here
```

### 3. Verify Installation
The package `openai` should already be installed. If not:
```bash
cd starter
npm install openai --legacy-peer-deps
```

## Usage

### Access the Feature
1. Navigate to the HTV Admin Dashboard (`/admin/htv`)
2. Click the "✨ Edit Image with AI" button in the top right
3. A modal will open

### How to Edit Images
1. **Upload an Image**: Click the upload area or drag & drop an image (PNG, JPG)
2. **Enter a Prompt**: Describe how you want to edit the image. Examples:
   - "Make the background blue"
   - "Add a sunglasses to the person"
   - "Change the logo color to red"
   - "Add text saying 'SALE' at the bottom"
3. **Click "Edit Image"**: The AI will process your request (30-60 seconds)
4. **Download Result**: Once complete, click "Download" to save the edited image

## Pricing
- **DALL-E 3 (512x512)**: $0.040 per image (better quality)
- **DALL-E 2 (512x512)**: $0.018 per image (faster, cheaper fallback)
- The modal is limited to max 500x500 output size

## Troubleshooting

### "Image generation models not available"
**Solution:**
1. Verify you have a **valid payment method** on your OpenAI account
2. Wait 24 hours if you just added a payment method
3. Check that your account isn't in a restricted region
4. Try creating a new API key

### "OpenAI quota exceeded"
**Solution:**
- Check your usage at https://platform.openai.com/account/usage/overview
- Review your billing plan at https://platform.openai.com/account/billing/overview
- Increase your usage limits if needed

### "Invalid OpenAI API key"
**Solution:**
- Verify the key is correct in `.env.local`
- The key should start with `sk-`
- Regenerate the key at https://platform.openai.com/api-keys
- Restart the dev server: `npm run dev`

### Modal doesn't appear
**Solution:**
- Clear browser cache (Ctrl+F5)
- Verify you're logged in as an admin
- Check browser console for errors (F12 → Console)

## Environment Variables
```
OPENAI_API_KEY=sk-your-key-here
```

**Note**: This key should never be committed to git. It's included in `.env.local` which is in `.gitignore`.

## Support
- OpenAI API Issues: https://help.openai.com
- Check API Status: https://status.openai.com
- Contact OpenAI Support: https://help.openai.com/en/collections/3675931-openai-support
