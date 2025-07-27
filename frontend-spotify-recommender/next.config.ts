import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    domains: ['i.scdn.co', 'via.placeholder.com', 'lh3.googleusercontent.com', 'image-cdn-ak.spotifycdn.com', 'image-cdn-fa.spotifycdn.com', 'mosaic.scdn.co'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};

export default nextConfig;
