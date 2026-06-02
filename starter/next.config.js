/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Redirect non-www to www to enforce canonical host
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'dosnine.com',
          },
        ],
        destination: 'https://www.dosnine.com/:path*',
        permanent: true,
      },
      {
        source: '/landlord/dashboard',
        destination: '/properties/my-listings',
        permanent: true,
      },
      {
        source: '/landlord/new-property',
        destination: '/properties/new',
        permanent: true,
      },
    ]
  },
};
module.exports = nextConfig;
