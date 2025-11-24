const path = require('path');

// Don't require next-pwa during development. Requiring it at module
// load time pulls in workbox-related packages that can fail to resolve
// in some environments. Only load it in production.
let withPWA = (config) => config;
if (process.env.NODE_ENV === 'production') {
  try {
    withPWA = require('next-pwa')({
      dest: 'public',
      disable: false,
    });

  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('next-pwa failed to load, skipping PWA setup:', err && err.message);
    withPWA = (config) => config;
  }
}

const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
});

module.exports = withPWA(
  withMDX({
    reactStrictMode: true,
    pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
    images: {
      domains: ['images.unsplash.com'],
    },
    webpack: (config) => {
      config.resolve.alias['@components'] = path.join(__dirname, 'components');
      return config;
    },
  })
);
