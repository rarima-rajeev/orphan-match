// Health check for the daily portfolio monitor (github.com/rarima-rajeev/portfolio-health).
// Sends one tiny real request to the Gemini model the agent uses, with the same settings,
// so a retired or renamed model, a bad key or a reached spending cap shows up the same day.
// It does not run a full search (about ₹4 each). Results are reused for 10 minutes.
import { MODEL } from "@/lib/agent";

export const dynamic = "force-dynamic";

type Result = { ok: boolean; model: string; detail?: string };
let cached: { at: number; result: Result } | null = null;
const CACHE_MS = 10 * 60 * 1000;

async function check(): Promise<Result> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, model: MODEL, detail: "GEMINI_API_KEY is missing" };
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Reply with OK." }] }],
        generationConfig: { temperature: 0.2, thinkingConfig: { thinkingLevel: "low" } },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) return { ok: true, model: MODEL };
    return { ok: false, model: MODEL, detail: `${res.status}: ${(await res.text()).slice(0, 200)}` };
  } catch (e) {
    return { ok: false, model: MODEL, detail: (e as Error).message };
  }
}

export async function GET() {
  if (!cached || Date.now() - cached.at > CACHE_MS) cached = { at: Date.now(), result: await check() };
  const { result } = cached;
  return Response.json(result, { status: result.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
