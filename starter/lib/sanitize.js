/**
 * Input sanitization utilities for XSS prevention
 */

/**
 * Sanitize text input by escaping HTML special characters
 */
export function sanitizeText(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize and validate price input
 */
export function sanitizePrice(price) {
  const num = Number(price);
  if (isNaN(num) || num < 0) return 0;
  return Math.floor(num); // Remove decimals
}

/**
 * Sanitize and validate number input (bedrooms, bathrooms)
 */
export function sanitizeNumber(num, min = 0, max = 100) {
  const n = Number(num);
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone) {
  if (!phone) return '';
  // Remove all non-digit characters except + and -
  return String(phone).replace(/[^\d+\-\s()]/g, '').substring(0, 20);
}

/**
 * Validate file is an image
 */
export function validateImageFile(file) {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!validTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type: ${file.name}. Only JPG, PNG, WebP, GIF allowed.` };
  }

  if (file.size > maxSize) {
    return { valid: false, error: `File too large: ${file.name}. Max 10MB.` };
  }

  return { valid: true };
}

/**
 * Sanitize area/town name
 */
export function sanitizeArea(area) {
  if (!area) return '';
  // Allow letters, numbers, spaces, commas, hyphens
  return String(area)
    .replace(/[^a-zA-Z0-9\s,\-]/g, '')
    .substring(0, 100);
}

/**
 * Generate safe slug from text
 */
export function generateSafeSlug(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}
