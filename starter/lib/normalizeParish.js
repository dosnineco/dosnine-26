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
 * Standard parish list for Jamaica (all 14 parishes)
 * Use this constant throughout the application for consistency
 */
export const PARISHES = [
  'Kingston',
  'St Andrew',
  'St Catherine',
  'St James',
  'St Mary',
  'St Ann',
  'Trelawny',
  'Portland',
  'St Thomas',
  'Clarendon',
  'Manchester',
  'St Elizabeth',
  'Hanover',
  'Westmoreland'
];
