const { execFileSync } = require('child_process');

function getPlatformVersion() {
  if (process.env.NEXT_PUBLIC_PLATFORM_VERSION) {
    return process.env.NEXT_PUBLIC_PLATFORM_VERSION;
  }

  try {
    const commitRef = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'HEAD';
    const commitCount = execFileSync('git', ['rev-list', '--count', commitRef], {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (/^\d+$/.test(commitCount)) return `v${commitCount}`;
  } catch {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Unable to determine the platform version from Git history. Provide NEXT_PUBLIC_PLATFORM_VERSION or deploy with Git history available.'
      );
    }
  }

  return 'dev';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['qrcode.react'],

  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_PLATFORM_VERSION: getPlatformVersion(),
  },
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
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/sign-in',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/sign-up',
        destination: '/dashboard',
        permanent: false,
      },
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
