import type { NextConfig } from 'next';

/**
 * The console is a static export served from S3 behind CloudFront
 * (SDD 6.1, ADR-14): no Node server, no middleware, no server actions.
 * Security headers (CSP, HSTS, frame-ancestors) are set by CloudFront.
 */
const nextConfig: NextConfig = {
  output: 'export',
  // `/societies/` → `/societies/index.html`, which S3 serves without rewrites.
  trailingSlash: true,
  typedRoutes: true,
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
