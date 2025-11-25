import Head from 'next/head';
import React from 'react';

const Seo = ({ siteTitle, pageTitle, description, url, image }) => {
    return (
        <Head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>{`${pageTitle} | ${siteTitle}`}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content="
                rental properties Jamaica, 
                apartments for rent Jamaica, 
                houses for rent Kingston, 
                Montego Bay rentals, 
                property listings Jamaica, 
                Jamaica real estate, 
                rent apartment Kingston, 
                short term rentals Jamaica, 
                long term rentals Jamaica, 
                furnished apartments Jamaica, 
                student housing Jamaica, 
                commercial properties Jamaica,
                St Andrew rentals,
                Ocho Rios apartments,
                property for rent Jamaica,
                Jamaica housing,
                rental homes Jamaica
            " />
            <meta name="robots" content="index, follow" />

            {/* Open Graph for Social Sharing */}
            <meta property="og:title" content={pageTitle} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={url} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:site_name" content={siteTitle} />

            {/* Twitter Card for Twitter SEO */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={url} />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />

            {/* Canonical URL */}
            <link rel="canonical" href={url} />

            {/* Schema Markup for SEO */}
            <script type="application/ld+json">
                {JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "RealEstateAgent",
                    "name": siteTitle,
                    "url": url,
                    "description": description,
                    "areaServed": {
                        "@type": "Country",
                        "name": "Jamaica"
                    },
                    "address": {
                        "@type": "PostalAddress",
                        "addressCountry": "JM"
                    },
                    "image": image,
                    "priceRange": "JMD"
                })}
            </script>

            {/* Favicons */}
            <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
            <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
            <meta name="theme-color" content="#ffffff" />
        </Head>
    );
};

export default Seo;
