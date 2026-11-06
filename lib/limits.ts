// Daily search limits for the public site. Each search costs about ₹4 in Gemini usage, so:
// - the whole site allows SITE_SEARCHES_PER_DAY live searches a day (protects the budget)
// - each visitor allows VISITOR_SEARCHES_PER_DAY (stops one person using it all up)
// Counters live in memory and reset at midnight UTC. On Vercel they are per server instance,
// so the real totals can be a little higher; the spend cap on the Gemini key is the hard backstop.
import { createHash } from "node:crypto";

const SITE_LIMIT = Number(process.env.SITE_SEARCHES_PER_DAY ?? 30);
const VISITOR_LIMIT = Number(process.env.VISITOR_SEARCHES_PER_DAY ?? 3);

const today = () => new Date().toISOString().slice(0, 10);
let day = today();
let siteCount = 0;
const byVisitor = new Map<string, number>();

// Visitors are told apart by a hash of their IP address; the IP itself is never stored.
export function visitorId(req: Request): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export type Admission = { ok: true } | { ok: false; message: string };

export function admitSearch(visitor: string): Admission {
  if (day !== today()) {
    day = today();
    siteCount = 0;
    byVisitor.clear();
  }
  if (siteCount >= SITE_LIMIT) {
    return { ok: false, message: "Today's searches for this demo are used up. Please come back tomorrow." };
  }
  const used = byVisitor.get(visitor) ?? 0;
  if (used >= VISITOR_LIMIT) {
    return { ok: false, message: `You've used your ${VISITOR_LIMIT} searches for today. Please come back tomorrow.` };
  }
  siteCount += 1;
  byVisitor.set(visitor, used + 1);
  return { ok: true };
}
