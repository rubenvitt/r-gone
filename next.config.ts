import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['nodemailer'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-only packages from client bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        'nodemailer': false,
        'fs': false,
        'fs/promises': false,
        'net': false,
        'dns': false,
      };
    }
    return config;
  },
};

export default nextConfig;
