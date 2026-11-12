import posthog from "posthog-js";

// Visitor analytics. Next.js loads this file in the browser on every page.
// Events go to /ingest on this site, which next.config.ts forwards to PostHog, so ad blockers drop fewer of them.
// The PostHog project key is public by design (it ships in browser code), so it has a fallback here.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY || "phc_A7AQUNuHDWgP92hxthbkLJE53fGP2VnVBM3EbGgW9tKy";

posthog.init(key, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  defaults: "2025-05-24", // page views and page leaves, including client-side navigation
  person_profiles: "identified_only", // visitors stay anonymous
});

// lib/ code reads PostHog from window (feedback events, feature flags).
(window as unknown as { posthog: typeof posthog }).posthog = posthog;
