// 👍/👎 feedback hook. Does nothing until PostHog is wired in at the end of the portfolio build.
type PH = { capture: (event: string, props?: Record<string, unknown>) => void };

export function trackFeedback(props: { disease: string; drug?: string; rating: "up" | "down" }) {
  const ph = (globalThis as { posthog?: PH }).posthog;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !ph) return;
  ph.capture("orphan_match_feedback", props);
}
