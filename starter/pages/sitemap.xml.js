import { supabase } from '../lib/supabase';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dosnine.com';

function toXml(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq || 'weekly'}</changefreq>\n    <priority>${u.priority || '0.7'}</priority>\n  </url>`)
    .join('\n')}\n</urlset>`;
}

export async function getServerSideProps({ res }) {
  try {
    const staticPages = ['/', '/property', '/blog', '/properties/my-listings', '/properties/new', '/contact', '/privacy-policy', '/terms-of-service'];

    const { data: properties, error } = await supabase.from('properties').select('slug, updated_at').limit(1000);
    const urls = [];

    staticPages.forEach((p) => {
      urls.push({ loc: `${SITE_URL}${p === '/' ? '' : p}`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: '0.8' });
    });

    // High-value SEO search landing pages
    const parishes = ['st-catherine', 'kingston', 'st-andrew', 'st-james', 'clarendon', 'manchester', 'st-ann', 'portland', 'st-thomas', 'st-elizabeth', 'trelawny', 'hanover'];
    const propertyTypes = ['apartments-for-rent', 'houses-for-rent'];
    const bedrooms = ['1-bedroom-apartment', '2-bedroom-house', '3-bedroom-house'];
    const specificLocations = [
      'houses-for-rent-spanish-town',
      'houses-for-rent-portmore',
      'apartments-for-rent-portmore',
      'houses-for-rent-old-harbour',
      'apartments-for-rent-montego-bay',
      'houses-for-rent-mandeville',
      'apartments-for-rent-ocho-rios',
      'houses-for-rent-kingston',
      'apartments-for-rent-kingston'
    ];

    // Generate parish-based search pages (e.g., /search/apartments-for-rent-st-catherine)
    parishes.forEach((parish) => {
      propertyTypes.forEach((type) => {
        urls.push({
          loc: `${SITE_URL}/search/${type}-${parish}`,
          lastmod: new Date().toISOString(),
          changefreq: 'daily',
          priority: '0.95'
        });
      });

      // Generate bedroom-specific pages (e.g., /search/2-bedroom-house-st-catherine)
      bedrooms.forEach((bedroom) => {
        urls.push({
          loc: `${SITE_URL}/search/${bedroom}-${parish}`,
          lastmod: new Date().toISOString(),
          changefreq: 'daily',
          priority: '0.95'
        });
      });
    });

    // Add specific high-traffic location searches
    specificLocations.forEach((location) => {
      urls.push({
        loc: `${SITE_URL}/search/${location}`,
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '0.95'
      });
    });

    // Dynamic search pages based on actual property data
    if (!error && properties && properties.length) {
      // Get unique parish/bedroom combinations from database
      const { data: searchVariants } = await supabase
        .from('properties')
        .select('parish, bedrooms, town')
        .eq('status', 'available')
        .limit(500);

      const uniqueSearches = new Set();
      
      if (searchVariants && searchVariants.length) {
        searchVariants.forEach((prop) => {
          if (prop.parish) {
            const parishSlug = prop.parish.toLowerCase().replace(/ /g, '-');
            
            // Add town-specific searches for major areas
            if (prop.town) {
              const townSlug = prop.town.toLowerCase().replace(/ /g, '-');
              uniqueSearches.add(`houses-for-rent-${townSlug}`);
              uniqueSearches.add(`apartments-for-rent-${townSlug}`);
            }

            // Add bedroom-parish combinations that actually exist
            if (prop.bedrooms && prop.bedrooms <= 4) {
              uniqueSearches.add(`${prop.bedrooms}-bedroom-house-${parishSlug}`);
              uniqueSearches.add(`${prop.bedrooms}-bedroom-apartment-${parishSlug}`);
            }
          }
        });

        // Add unique search combinations (limit to 200 to keep sitemap reasonable)
        Array.from(uniqueSearches).slice(0, 200).forEach((searchPath) => {
          urls.push({
            loc: `${SITE_URL}/search/${searchPath}`,
            lastmod: new Date().toISOString(),
            changefreq: 'weekly',
            priority: '0.85'
          });
        });
      }

      // Add individual property pages
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
