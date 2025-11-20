import Head from 'next/head';
import React from 'react';

const Seo = ({ siteTitle, pageTitle, description, url, image }) => {
    return (
        <Head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>{`${pageTitle} | ${siteTitle}`}</title>
            <meta name="description" content={`${description} Discover the best online expense software, business expense tracking tools, and travel and expense management systems.`} />
            <meta name="keywords" content="
                online expense software, 
                expense management online, 
                expense management software uk, 
                business expense management software, 
                business expense tracking software, 
                manage expense, 
                expense tracking software for small business, 
                expense management software for small business - 10k, 
                expense management program -10k, 
                expense management tools, 
                business expense tracking software, 
                expense management platforms, 
                employee expense tracking, 
                company expense tracker, 
                time and expense tracking software, 
                travel and expense management system -over 100usd, 
                time expense tracking software, 
                best business expense tracking software
            " />
            <meta name="robots" content="index, follow" />

            {/* Open Graph for Social Sharing */}
            <meta property="og:title" content={pageTitle} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={url} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:image:alt" content="Best Business Expense Tracking Software" />
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
                    "@type": "SoftwareApplication",
                    "name": siteTitle,
                    "url": url,
                    "description": description,
                    "applicationCategory": "FinanceApplication",
                    "operatingSystem": "Web",
                    "offers": {
                        "@type": "Offer",
                        "price": "0.00",
                        "priceCurrency": "USD"
                    },
                    "image": image
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
