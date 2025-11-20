const path = require('path');
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

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
