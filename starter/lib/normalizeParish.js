/**
 * Normalize parish name for consistent comparison
 * Removes extra spaces and periods from "St." variations
 * Examples:
 *   "St.  Andrew" → "St Andrew"
 *   "St. Andrew" → "St Andrew"
 *   "St Andrew" → "St Andrew"
 */
export function normalizeParish(parish) {
  if (!parish) return '';
  return parish
    .replace(/St\.\s+/g, 'St ')  // Remove period after St. and normalize spaces
    .replace(/\s+/g, ' ')         // Replace multiple spaces with single space
    .trim();
}

/**
 * Standard parish list for Jamaica
 * Use this constant throughout the application for consistency
 */
export const PARISHES = [
  'Kingston',
  'St Andrew',
  'St Catherine',
  'St James',
  'Clarendon',
  'Manchester',
  'St Ann',
  'Portland',
  'St Thomas',
  'St Elizabeth',
  'Trelawny',
  'Hanover'
];
