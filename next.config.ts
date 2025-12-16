import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,

  experimental: {
    // TS types lag behind runtime – cast is safe
    allowedDevOrigins: [
      '.cloudworkstations.dev',
      '.googleusercontent.com',
      'localhost',
    ],
  } as any,

  typescript: {
    ignoreBuildErrors: true,
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
};

export default nextConfig;
