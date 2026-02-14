import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      // Wayfair
      {
        protocol: "https",
        hostname: "**.wayfair.com",
      },
      {
        protocol: "https",
        hostname: "**.wfcdn.com",
      },
      // Home Depot
      {
        protocol: "https",
        hostname: "**.homedepot.com",
      },
      {
        protocol: "https",
        hostname: "**.thdstatic.com",
      },
      // Amazon
      {
        protocol: "https",
        hostname: "**.media-amazon.com",
      },
      // Target
      {
        protocol: "https",
        hostname: "**.target.com",
      },
      {
        protocol: "https",
        hostname: "**.scene7.com",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
