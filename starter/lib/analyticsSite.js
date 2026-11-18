const DEFAULT_SITE_URL = 'https://dosnine.com';

export function getCanonicalSiteHostname() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  const siteUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`;
  return new URL(siteUrl).hostname.toLowerCase().replace(/^www\./, '');
}

function normalizeHostname(value) {
  return value.toLowerCase().replace(/^www\./, '');
}

export function isCanonicalSiteHost(value, canonicalHostname = getCanonicalSiteHostname()) {
  if (!value) return false;
  try {
    const hostname = new URL(`https://${String(value).split(',')[0].trim()}`).hostname;
    return normalizeHostname(hostname) === canonicalHostname;
  } catch {
    return false;
  }
}

export function isCanonicalSiteUrl(value, canonicalHostname = getCanonicalSiteHostname()) {
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname;
    return normalizeHostname(hostname) === canonicalHostname;
  } catch {
    return false;
  }
}
