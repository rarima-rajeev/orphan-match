import { existsSync, readFileSync } from "fs";
import path from "path";
import Image from "next/image";

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


const DECISIONS = [
  ["An agent, not a fixed recipe", "Each rare disease needs a different search path."],
  ["A hard cap of 12 tool calls", "Keeps cost and waiting time predictable."],
  ["Code checks every source", "AI can invent sources. Code can't be talked out of a rule."],
  ["Approved medicines only", "Repurposing is only fast if safety is already known."],
  ["Show every step live", "People trust what they can watch."],
  ["Compare against a simple no-AI rule", "A score means little without something to beat."],
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
      <p>We timed the agent on all 20 test diseases (a second run), and checked 20 of its cited sentences against their sources.</p>
      <div className="table-wrap">
        <table className="metrics">
          <thead>
            <tr>
              <th></th>
              <th><span className="col-head">{ICONS.sparkle} Gemini AI agent</span></th>
              <th><span className="col-head">{ICONS.code} Simple no-AI rule <span className="muted small">(plain code written by Claude)</span></span></th>
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
              <th></th>
              <th><span className="col-head">{ICONS.sparkle} Gemini AI agent</span></th>
              <th><span className="col-head">{ICONS.person} A researcher by hand <span className="muted small">(estimate)</span></span></th>
            </tr>
          </thead>
          <tbody>
            <tr><td><Label icon={ICONS.clock}>Time per disease</Label></td><td>about 45 seconds</td><td>about 1–2 hours</td></tr>
            <tr><td><Label icon={ICONS.pages}>Records read</Label></td><td>about 41</td><td>the same ~41, found and read one by one</td></tr>
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 14 }}>
        <strong>Are the explanations accurate?</strong> Of 20 cited sentences we checked: 12 fully supported by their source,
        7 partly (true, but overstated), and 1 not supported. The agent is reliable on simple facts (&ldquo;this medicine acts on
        this protein&rdquo;) but tends to overstate how strong a link is. Checked by Claude, not a human expert.
      </p>
      <div className="card">
        <strong>What this means:</strong> The agent is a fast research assistant: it turns hours of database searching into
        under a minute, with sources. But it finds the right medicine only slightly more often than a free rule, and its
        explanations need a human to double-check.
      </div>

      <h2>Honest limits</h2>
      <ul>
        <li><strong>The AI may remember the answer.</strong> Gemini learned from today&apos;s internet, where these success stories are famous. We hide the answer from the tools, but we can&apos;t erase it from the AI&apos;s memory. The agent can only suggest medicines the tools returned, which limits this, but doesn&apos;t remove it.</li>
        <li><strong>The databases know today&apos;s science.</strong> We switch off the parts of Open Targets that come from drug trials and from scanning research papers, because they contain the answer. The genetic and biology data that remain still include discoveries made after each medicine was repurposed.</li>
        <li><strong>20 cases is small.</strong> It shows whether the idea works at all, not how often it would work.</li>
        <li><strong>The 20 cases were hand-picked.</strong> Claude Code, the AI coding assistant I used to build this, chose the cases and their discovery years from well-known medical history, not from an official dataset. A few discovery years are approximate, which may make the test slightly easier than it should be.</li>
        <li><strong>I am not a drug expert.</strong> I am an AI product manager. The test design and the wording here are my own, not reviewed by scientists.</li>
        <li><strong>These are ideas for researchers to check, not treatment advice.</strong></li>
      </ul>

      <h2>Key decisions</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Decision</th><th>Why</th></tr></thead>
          <tbody>{DECISIONS.map(([d, w]) => <tr key={d}><td>{d}</td><td>{w}</td></tr>)}</tbody>
        </table>
      </div>

      <h2>What&apos;s next</h2>
      <ul>
        <li>More test cases, including ones where repurposing was tried and failed.</li>
        <li>Re-run the test with an older AI model whose training data stops earlier, to reduce the &ldquo;AI remembers&rdquo; problem.</li>
        <li>Ask rare-disease researchers to rate the suggestions.</li>
      </ul>
    </>
  );
}

const IC = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const ICONS = {
  sparkle: <svg {...IC}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg>,
  code: <svg {...IC}><path d="M8 8l-4 4 4 4M16 8l4 4-4 4" /></svg>,
  person: <svg {...IC}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1-4 4-6 7-6s6 2 7 6" /></svg>,
  target: <svg {...IC}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" /></svg>,
  clock: <svg {...IC}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>,
  pages: <svg {...IC}><path d="M7 4h8l3 3v13H7z" /><path d="M10 11h5M10 14h5M10 17h3" /></svg>,
  quote: <svg {...IC}><path d="M5 6h14v9H9l-4 4z" /><path d="M9 10h6" /></svg>,
};

function Label({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <span className="metric-label"><span className="metric-icon">{icon}</span>{children}</span>;
}
