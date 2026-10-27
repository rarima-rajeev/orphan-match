import Image from "next/image";
export const metadata = { title: "How the agent works — Orphan Match" };

const TOOLS = [
  ["Open Targets", "Which proteins are linked to this disease? Which approved medicines act on those proteins?"],
  ["ClinicalTrials.gov", "Has anyone already tested this medicine for this disease?"],
  ["PubMed", "Are there research papers that support the link?"],
  ["openFDA", "What safety warnings are on the medicine's official US label?"],
];

const SPLIT = [
  ["Which 4 tools exist", "Which tool to use next"],
  ["At most 12 tool calls per question", "What to search for"],
  ["Only approved medicines are allowed", "When it has enough evidence"],
  ["Every medicine and source must come from a real tool result. Anything else is removed.", "How to rank the medicines and explain why"],
];

export default function HowItWorks() {
  return (
    <>
      <h1>How the agent works</h1>
      <p className="lead">
        Most software follows a fixed recipe: step 1, step 2, step 3. This one doesn&apos;t. The AI (Google&apos;s Gemini) is
        given four tools and a goal, and it chooses its own next step, like a researcher deciding which library to visit next.
        That is what makes it an <strong>agent</strong>.
      </p>

      <Image className="picture" src="/images/agent.webp" alt="Illustration: a lantern on a map, choosing between four paths to a library, a lab, an archive and a medicine shelf" width={1400} height={781} sizes="(max-width: 820px) 100vw, 788px" priority />

      <div className="card">
        <Diagram />
        <p className="small muted" style={{ margin: "4px 8px 0" }}>
          * Only 4 databases are connected, but Gemini can still make things up (&ldquo;hallucinate&rdquo;) from its own
          memory: a medicine, paper or trial that no tool actually returned. The safety check is plain code, written with
          Claude Code, and it removes anything like that before you see it.
        </p>
      </div>

      <h2>A few words, explained</h2>
      <div className="table-wrap">
        <table>
          <tbody>
            <tr><th>Rare disease</th><td>A disease so uncommon that few companies make medicines for it. Most of the ~7,000 known rare diseases have no approved treatment.</td></tr>
            <tr><th>Protein (or &ldquo;target&rdquo;)</th><td>A tiny part of the body&apos;s machinery that a medicine latches onto to change how it works.</td></tr>
            <tr><th>Repurposing</th><td>Using a medicine already approved for one illness to treat a different one. Faster and cheaper, because its safety is already known.</td></tr>
            <tr><th>Tool call</th><td>The AI asking a database a question, like &ldquo;which proteins are linked to this disease?&rdquo;</td></tr>
          </tbody>
        </table>
      </div>

      <h2>The four tools</h2>
      <p className="muted">All four are free, public science databases.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Tool</th><th>What it answers</th></tr></thead>
          <tbody>{TOOLS.map(([t, a]) => <tr key={t}><td><strong>{t}</strong></td><td>{a}</td></tr>)}</tbody>
        </table>
      </div>

      <h2>What the code decides vs what the AI decides</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>The code decides (fixed rules)</th><th>Gemini decides (judgment)</th></tr></thead>
          <tbody>{SPLIT.map(([c, g]) => <tr key={c}><td>{c}</td><td>{g}</td></tr>)}</tbody>
        </table>
      </div>

      <h2>Why an agent here, and not a fixed recipe?</h2>
      <p>
        Every rare disease is different. For one, the best clue is a protein. For another, it&apos;s an old clinical trial.
        A fixed recipe would waste steps on some diseases and miss clues on others. The trade-off: an agent is less
        predictable, so the rules in the left-hand column above are enforced by code, not left to the AI.
      </p>
      <p className="muted">
        For contrast, my other project, Phase Zero, is a fixed pipeline on purpose: there, every step must run the same way every time.
        Knowing when to use which is a product decision.
      </p>
    </>
  );
}

function Diagram() {
  const box = { fill: "var(--card)", stroke: "var(--line)", strokeWidth: 1.5, rx: 10 };
  const ai = { fill: "var(--accent-soft)", stroke: "var(--accent)", strokeWidth: 1.5, rx: 10 };
  const code = { fill: "var(--good-soft)", stroke: "var(--good)", strokeWidth: 1.5, rx: 10 };
  const t = { fill: "var(--text)", fontSize: 14, textAnchor: "middle" as const };
  const m = { fill: "var(--muted)", fontSize: 12, textAnchor: "middle" as const };
  const tools = ["Open Targets", "ClinicalTrials|.gov", "PubMed", "openFDA"];
  return (
    <svg className="diagram" viewBox="0 0 640 400" role="img" aria-label="Diagram of the agent loop">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--muted)" />
        </marker>
      </defs>
      <g stroke="var(--muted)" strokeWidth="1.5" fill="none" markerEnd="url(#arr)">
        <path d="M110 70 L230 70" />
        <path d="M320 100 L320 160" />
        <path d="M410 70 L470 70" />
        <path d="M560 100 L560 300 L500 300" />
        <path d="M320 270 L320 100" strokeDasharray="0" opacity="0" />
        <path d="M150 300 L110 300" />
      </g>
      {/* question */}
      <rect x="10" y="40" width="100" height="60" {...box} />
      <text x="60" y="68" {...t}>Your</text>
      <text x="60" y="86" {...t}>question</text>
      {/* gemini */}
      <rect x="230" y="40" width="180" height="60" {...ai} />
      <text x="320" y="66" {...t} fontWeight={700}>Gemini thinks</text>
      <text x="320" y="85" {...m}>Which tool next? Enough yet?</text>
      {/* tools */}
      <rect x="140" y="160" width="360" height="104" {...code} />
      <text x="320" y="178" {...m}>Gemini asks for a search →</text>
      <text x="320" y="193" {...m}>code runs it and hands back the result</text>
      {tools.map((name, i) => (
        <g key={name}>
          <rect x={152 + i * 86} y="203" width="78" height="50" {...box} />
          {name.split("|").map((line, j, all) => (
            <text key={j} x={191 + i * 86} y={232 + (j - (all.length - 1) / 2) * 13} {...t} fontSize={11}>{line}</text>
          ))}
        </g>
      ))}
      <path d="M140 215 C 85 215, 85 85, 228 85" stroke="var(--accent)" strokeWidth="1.5" fill="none" markerEnd="url(#arr)" />
      <text x="62" y="150" {...m} fill="var(--accent)">loop</text>
      <text x="62" y="166" {...m} fill="var(--accent)">(max 12,</text>
      <text x="62" y="182" {...m} fill="var(--accent)">set by code)</text>
      {/* answer */}
      <rect x="470" y="40" width="160" height="60" {...ai} />
      <text x="550" y="66" {...t}>&ldquo;I have enough&rdquo;</text>
      <text x="550" y="85" {...m}>writes ranked list</text>
      <rect x="150" y="278" width="350" height="76" {...code} />
      <text x="325" y="301" {...t} fontWeight={700}>Safety check (TypeScript)</text>
      <text x="325" y="319" {...m}>Written with Claude Code</text>
      <text x="325" y="336" {...m}>*Removes any medicine or source the 4 tools didn&apos;t return</text>
      <rect x="10" y="270" width="100" height="60" {...box} />
      <text x="60" y="305" {...t}>You</text>
      {/* legend */}
      <rect x="150" y="368" width="14" height="14" {...ai} rx={3} />
      <text x="170" y="380" fill="var(--muted)" fontSize={12}>Gemini decides</text>
      <rect x="290" y="368" width="14" height="14" {...code} rx={3} />
      <text x="310" y="380" fill="var(--muted)" fontSize={12}>Code enforces a rule</text>
    </svg>
  );
}
