import { supabase } from '../lib/supabase';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dosnine.com';

function toXml(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq || 'weekly'}</changefreq>\n    <priority>${u.priority || '0.7'}</priority>\n  </url>`)
    .join('\n')}\n</urlset>`;
}

export async function getServerSideProps({ res }) {
  try {
    const staticPages = ['/', '/property', '/blog', '/landlord', '/landlord/dashboard', '/landlord/new-property', '/contact', '/privacy-policy', '/terms-of-service'];

    const { data: properties, error } = await supabase.from('properties').select('slug, updated_at').limit(1000);
    const urls = [];

    staticPages.forEach((p) => {
      urls.push({ loc: `${SITE_URL}${p === '/' ? '' : p}`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: '0.8' });
    });

    if (!error && properties && properties.length) {
      properties.forEach((prop) => {
        if (!prop.slug) return;
        const path = `/property/${prop.slug}`;
        urls.push({ loc: `${SITE_URL}${path}`, lastmod: prop.updated_at || new Date().toISOString(), changefreq: 'daily', priority: '0.9' });
      });
    }

    const xml = toXml(urls);
    res.setHeader('Content-Type', 'application/xml');
    res.write(xml);
    res.end();
  } catch (err) {
    console.error('Sitemap generation error:', err);
    res.statusCode = 500;
    res.end();
  }

  return { props: {} };
}

export default function Sitemap() {
  return null;
}
