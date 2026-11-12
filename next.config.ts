import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Forward /ingest to PostHog (see instrumentation-client.ts).
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
  skipTrailingSlashRedirect: true, // PostHog's API paths end in a slash
};

export default nextConfig;
