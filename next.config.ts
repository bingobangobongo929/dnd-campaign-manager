import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
    ],
  },
  // Externalize jsdom and related packages to fix ESM/CJS compatibility issues
  // These packages are used by isomorphic-dompurify for server-side HTML sanitization
  serverExternalPackages: [
    'jsdom',
    'isomorphic-dompurify',
  ],
};

export default nextConfig;
