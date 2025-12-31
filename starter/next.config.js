/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    scrollRestoration: true,
  },
  async redirects() {
    return [
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
      {
        source: '/landlord/boost-property',
        destination: '/properties/boost-property',
        permanent: true,
      },
    ]
  },
};
module.exports = nextConfig;
