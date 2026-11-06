import { existsSync, readFileSync } from "fs";
import path from "path";
import Image from "next/image";
import { Head, Icon, Label } from "@/components/EmojiIcon";

export const metadata = { title: "Results & decisions — Orphan Match" };

type Result = {
  drug: string; disease: string; year: number; story: string;
  agent_rank: number | null; agent_hit: boolean; baseline_rank: number | null; baseline_hit: boolean;
  agent_top: string[]; tool_calls: number; cost_inr: number; error?: string;
};

function load<T>(file: string, fallback: T): T {
  const p = path.join(process.cwd(), "data", file);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback;
}


const DECISIONS: [Icon, string, string][] = [
  [{ e: "🧭", tone: "sky" }, "Let the AI choose its own search steps", "Every rare disease is different, so a fixed list of steps would miss clues."],
  [{ e: "🛑", tone: "rose" }, "Stop after 12 searches", "Keeps each answer under a minute and cheap to run."],
  [{ e: "🛡️", tone: "green" }, "Code double-checks every source", "If the AI makes up a medicine or a paper, the code removes it before you see it."],
  [{ e: "💊", tone: "amber" }, "Only suggest medicines that are already approved", "Their safety is already known, so they could reach patients much faster."],
  [{ e: "👀", tone: "violet" }, "Show each step as it happens", "People trust an answer more when they can see how it was found."],
  [{ e: "⚖️", tone: "slate" }, "Test it against a simple method with no AI", "Shows whether the AI is really adding anything."],
];
export default function Results() {
  const data = load<{ model?: string; run_date?: string; results: Result[] }>("eval-results.json", { results: [] });
  const rows = data.results;
  const n = rows.length;

  return (
    <>
      <h1>Results &amp; decisions</h1>
      <Image className="picture" src="/images/results.webp" alt="Illustration: an hourglass filled with medicine capsules and old research papers" width={1400} height={781} sizes="(max-width: 820px) 100vw, 788px" priority />

      <h2>Evals</h2>
      <h3 style={{ marginTop: 4 }}>The time-travel test (a backtest)</h3>
      <p>
        We picked {n || 20} medicines that later turned out to treat a different disease, some found by lucky accident, some
        by careful science. They&apos;re well-known success stories, so we already know the right answer.
      </p>
      <p>
        For example, fenfluramine was a weight-loss pill, withdrawn in 1997. The first research showing it could help a
        severe childhood epilepsy came out in 2011, and it was approved for that in 2020.
      </p>
      <p>
        To test the agent, we turned the clock back. For fenfluramine, the agent&apos;s tools could only show papers and trials
        from before 2011, and <strong>the known answer was hidden</strong>. Then we checked: using only that older information,
        did the agent still put fenfluramine in its top 10? We did the same for all {n || 20} medicines.
      </p>
      <p>
        It&apos;s like checking a weather forecast against past days, when you already know what happened. One catch: Gemini
        learned from today&apos;s internet, so it may remember some answers. See &ldquo;Honest limits&rdquo; below.
      </p>


      <h2>Speed and accuracy</h2>
      <p>
        We ran the same test twice, on the same 20 diseases. <strong>Run 1</strong> only checked whether the agent found the
        hidden medicine. <strong>Run 2</strong> repeated it to also measure speed and how much the agent read, which run 1
        didn&apos;t record. The scores differ slightly (3 vs 4 of 20) because an AI&apos;s answers vary a little each time.
      </p>
      <div className="table-wrap">
        <table className="metrics">
          <thead>
            <tr>
              <th><span className="col-head">What we measured</span></th>
              <th><Head icon={ICONS.sparkle}>Gemini AI agent</Head></th>
              <th><Head icon={ICONS.code}>Simple no-AI rule <span className="muted small">(plain code written by Claude)</span></Head></th>
            </tr>
          </thead>
          <tbody>
            <tr><td><Label icon={ICONS.target}>Found the hidden medicine</Label></td><td>3 of 20 (run 1), 4 of 20 (run 2)</td><td>2 of 20 (both runs)</td></tr>
            <tr><td><Label icon={ICONS.clock}>Time per disease</Label></td><td>about 45 seconds</td><td>about 7 seconds</td></tr>
            <tr><td><Label icon={ICONS.pages}>Records read per disease</Label></td><td>about 41 (about 3 pages)</td><td>about 38</td></tr>
            <tr><td><Label icon={ICONS.quote}>Explanation with sources</Label></td><td>Yes, about 9 sources per answer</td><td>No, names only</td></tr>
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: 22 }}>The agent vs doing it by hand</h3>
      <div className="table-wrap">
        <table className="metrics">
          <thead>
            <tr>
              <th><span className="col-head">What we measured</span></th>
              <th><Head icon={ICONS.sparkle}>Gemini AI agent</Head></th>
              <th><Head icon={ICONS.code}>Simple no-AI rule</Head></th>
              <th><Head icon={ICONS.person}>A researcher by hand <span className="muted small">(estimate)</span></Head></th>
            </tr>
          </thead>
          <tbody>
            <tr><td><Label icon={ICONS.clock}>Time per disease</Label></td><td>about 45 seconds</td><td>about 7 seconds</td><td>about 1–2 hours</td></tr>
            <tr><td><Label icon={ICONS.stack}>Time for all 20 test diseases</Label></td><td>about 15 minutes</td><td>about 2.5 minutes</td><td>about 20–40 hours (3–5 working days)</td></tr>
            <tr><td><Label icon={ICONS.pages}>Records read per disease</Label></td><td>about 41</td><td>about 38</td><td>the same ~41, found and read one by one</td></tr>
            <tr><td><Label icon={ICONS.search}>Choosing the 20 test cases</Label></td><td colSpan={2}>Not part of the test itself: Claude Code picked them in a few minutes</td><td>about 1–2 days of reading medical history</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Honest limits</h2>
      <ul>
        <li><strong>The AI may remember the answer.</strong> Gemini learned from today&apos;s internet, where these success stories are famous. We hide the answer from the tools, but we can&apos;t erase it from the AI&apos;s memory. The agent can only suggest medicines the tools returned, which limits this, but doesn&apos;t remove it.</li>
        <li><strong>The databases know today&apos;s science.</strong> We switch off the parts of Open Targets that come from drug trials and from scanning research papers, because they contain the answer. The genetic and biology data that remain still include discoveries made after each medicine was repurposed.</li>
        <li><strong>20 cases is small.</strong> It shows whether the idea works at all, not how often it would work.</li>
        <li><strong>The 20 cases were hand-picked.</strong> Claude Code, the AI coding assistant I used to build this, chose the cases and their discovery years from well-known medical history, not from an official dataset. A few discovery years are approximate, which may make the test slightly easier than it should be.</li>
        <li><strong>These are ideas for researchers to check, not treatment advice.</strong></li>
      </ul>

      <h2>Key decisions</h2>
      <div className="table-wrap">
        <table className="metrics">
          <thead><tr><th><Head icon={{ e: "✅", tone: "green" }}>What we decided</Head></th><th><Head icon={{ e: "💡", tone: "amber" }}>Why</Head></th></tr></thead>
          <tbody>{DECISIONS.map(([icon, d, w]) => <tr key={d}><td><Label icon={icon}>{d}</Label></td><td>{w}</td></tr>)}</tbody>
        </table>
      </div>

      <h2>What&apos;s next</h2>
      <ul>
        <li>More test cases, including ones where repurposing was tried and failed.</li>
        <li>Re-run the test with an older AI model whose training data stops earlier, to reduce the &ldquo;AI remembers&rdquo; problem.</li>
        <li>Ask rare-disease researchers to rate the suggestions.</li>
      </ul>

      <MoreProjects />
    </>
  );
}

// Colourful emoji icons, each with its own soft background tone.
const ICONS = {
  sparkle: { e: "🤖", tone: "sky" },
  code: { e: "⚙️", tone: "slate" },
  person: { e: "🧑‍🔬", tone: "teal" },
  target: { e: "🎯", tone: "rose" },
  clock: { e: "⏱️", tone: "sky" },
  pages: { e: "📚", tone: "amber" },
  quote: { e: "💬", tone: "green" },
  stack: { e: "🗓️", tone: "violet" },
  search: { e: "🔍", tone: "teal" },
};

const LI = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
const PROFILE_LINKS = [
  {
    label: "Portfolio", href: "https://rarima-rajeev.my.canva.site/",
    icon: <svg {...LI}><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" /></svg>,
  },
  {
    label: "LinkedIn", href: "https://www.linkedin.com/in/rarima-rajeev",
    icon: <svg {...LI}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>,
  },
  {
    label: "GitHub", href: "https://github.com/rarima-rajeev/orphan-match",
    icon: <svg {...LI}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>,
  },
];

function MoreProjects() {
  return (
    <section className="more-projects">
      <h2>More projects and the full case study</h2>
      <p>The write-up, code and other AI product projects live here.</p>
      <div className="more-links">
        {PROFILE_LINKS.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">
            {l.icon}
            <span>{l.label}</span>
            <svg {...LI} className="more-arrow"><path d="M7 17L17 7M7 7h10v10" /></svg>
          </a>
        ))}
      </div>
    </section>
  );
}
