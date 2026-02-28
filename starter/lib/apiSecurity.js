import { z } from 'zod';
import { sanitizeText, sanitizePhone, sanitizeArea, sanitizeNumber, sanitizePrice } from '@/lib/sanitize';

export function enforceMethods(req, res, allowedMethods = []) {
  if (!allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }

  return true;
}

export function safeApiError(res, status = 500, message = 'Internal server error') {
  return res.status(status).json({ error: message });
}

export function parseBody(schema, body) {
  return schema.parse(body || {});
}

export function parseQuery(schema, query) {
  return schema.parse(query || {});
}

export function sanitizeString(value, maxLength = 5000) {
  return sanitizeText(String(value || '').trim()).slice(0, maxLength);
}

export function sanitizeEmail(value) {
  return String(value || '').trim().toLowerCase().slice(0, 254);
}

export function sanitizePhoneInput(value) {
  return sanitizePhone(value || '').trim();
}

export function sanitizeLocation(value) {
  return sanitizeArea(value || '').trim();
}

export function sanitizeInt(value, min, max) {
  return sanitizeNumber(value, min, max);
}

export function sanitizeMoney(value) {
  return sanitizePrice(value);
}

export function isBotLikely(payload = {}) {
  const honeypot = payload?.website || payload?.company || payload?.url || '';
  return typeof honeypot === 'string' && honeypot.trim().length > 0;
}

export const uuidSchema = z.string().uuid();