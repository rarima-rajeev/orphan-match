// 👍/👎 feedback hook. Sends an event to PostHog (started in instrumentation-client.ts).
type PH = { capture: (event: string, props?: Record<string, unknown>) => void };

export function trackFeedback(props: { disease: string; drug?: string; rating: "up" | "down" }) {
  const ph = (globalThis as { posthog?: PH }).posthog;
  if (!ph) return;
  ph.capture("orphan_match_feedback", props);
}
