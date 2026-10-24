// Streams the agent's steps to the browser as they happen (one JSON object per line).
import { runAgent } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const { disease } = await req.json().catch(() => ({}));
  const name = typeof disease === "string" ? disease.trim().slice(0, 120) : "";
  if (!name) return new Response("Please name a disease", { status: 400 });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(new TextEncoder().encode(JSON.stringify(obj) + "\n"));
      try {
        await runAgent(name, send);
      } catch (e) {
        send({ type: "error", text: (e as Error).message });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
