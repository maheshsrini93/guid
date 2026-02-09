import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.ikea.com",
      },
      {
        protocol: "https",
        hostname: "**.ikeaimg.com",
      },
    ],
  },
};

export default nextConfig;
