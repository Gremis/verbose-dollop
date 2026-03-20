import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
  },
  serverExternalPackages: ["@napi-rs/canvas"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "onpoint-tradingapp.s3.amazonaws.com" },
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "assets.coingecko.com" },
    ],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "@napi-rs/canvas": false,
      };
    }
    return config;
  },

  async redirects() {
    return [
      {
        source: "/trade-analyzer/:path*",
        destination: "/dashboard",
        permanent: false, // 307 redirect - temporary, reversible
      },
    ];
  },
};

export default nextConfig;
