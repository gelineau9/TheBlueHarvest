import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required for the multi-stage Docker build — produces a self-contained
  // server.js plus the exact node_modules it needs, nothing more.
  output: 'standalone',

  images: {
    remotePatterns: [
      // Supabase Storage CDN — serves both images and avatars buckets
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SUPABASE_HOSTNAME ?? 'your-project-ref.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Render backend — temporary fallback while upload migration is in progress
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_BACKEND_HOSTNAME ?? 'yourdomain.com',
        pathname: '/uploads/**',
      },
    ],
  },
  transpilePackages: ['react-image-crop'],
};

export default nextConfig;
