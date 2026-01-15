import type { NextConfig } from 'next';
import withPWA from '@ducanh2912/next-pwa';

const withPWAConfig = withPWA({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  devIndicators: false,

  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    // @ts-ignore - Turbopack type not yet updated in Next.js types
    turbopack: {
      resolveAlias: {
        '@firebase/firestore': '@firebase/firestore/dist/index.esm2017.js',
      },
    },
    // Allow the dev server to accept requests from the cloud workstation proxy
    allowedDevOrigins: ['*.cloudworkstations.dev'],
  },
};

export default withPWAConfig(nextConfig);
