"use client";
import { useRef, useState } from "react";
import type { AgentEvent, DrugMatch, FinalAnswer } from "@/lib/agent";
import { trackFeedback } from "@/lib/feedback";

const EXAMPLES = [
  { name: "Castleman disease", plain: "A rare immune disorder that makes lymph nodes swell" },
  { name: "Lymphangioleiomyomatosis", plain: "A rare lung disease, mostly in young women" },
  { name: "Fibrodysplasia ossificans progressiva", plain: "A very rare genetic disease where muscle slowly turns into bone" },
];

type SpeechRec = { lang: string; interimResults: boolean; start: () => void; stop: () => void;
  onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; onerror: () => void };

export default function FindAMatch() {
  const [disease, setDisease] = useState("");
  const [steps, setSteps] = useState<{ text: string; kind: string }[]>([]);
  const [answer, setAnswer] = useState<FinalAnswer | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState("");
  const recRef = useRef<SpeechRec | null>(null);

  async function search(name: string) {
    if (!name.trim() || busy) return;
    setDisease(name);
    setBusy(true);
    setSteps([]);
    setAnswer(null);
    setError("");
    try {
      const res = await fetch("/api/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ disease: name }) });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const e = JSON.parse(line) as AgentEvent;
          if (e.type === "step") {
            const kind = e.text.startsWith("→") ? "result" : e.text.startsWith("Agent decided") ? "done" : "call";
            setSteps((s) => [...s, { text: e.text, kind }]);
          } else if (e.type === "answer") setAnswer(e.answer);
          else if (e.type === "error") setError(e.text);
        }
      }
    } catch (e) {
      setError((e as Error).message || "Something went wrong");
    }
    setBusy(false);
  }

  function toggleMic() {
    if (listening) { recRef.current?.stop(); return; }
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Rec = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Rec) { setMicNote("Voice input doesn't work in this browser. Please type instead."); return; }
    const rec = new Rec();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => { const t = e.results[0][0].transcript; setDisease(t); search(t); };
    rec.onend = () => setListening(false);
    rec.onerror = () => { setListening(false); setMicNote("Couldn't hear that. Please try again or type instead."); };
    recRef.current = rec;
    setMicNote("");
    setListening(true);
    rec.start();
  }

  return (
    <>
      <section className="hero">
        <span className="eyebrow">Agentic AI</span>
        <h1>The hidden cure</h1>
        <p className="lead">
        Some rare diseases might be helped by a medicine that already exists, one approved for a different illness.
        Type or say the name of a rare disease. An AI agent will search four free science databases for possible matches,
        and show you every step and every source.
        </p>
      </section>

      <form className="search" onSubmit={(e) => { e.preventDefault(); search(disease); }}>
        <input value={disease} onChange={(e) => setDisease(e.target.value)} placeholder="e.g. Castleman disease" aria-label="Rare disease name" />
        <button type="button" onClick={toggleMic} className={listening ? "listening" : ""} disabled={busy}>
          {listening ? "● Listening…" : "🎤 Speak"}
        </button>
        <button type="submit" className="primary" disabled={busy || !disease.trim()}>{busy ? "Searching…" : "Find matches"}</button>
      </form>
      {micNote && <p className="small muted" style={{ marginTop: 8 }}>{micNote}</p>}
      <p className="audience">
        <strong>Built for rare diseases</strong>, the kind most medicine companies overlook. It&apos;s meant for researchers and
        patient groups. Everyday illnesses like fever, sore throat or eczema won&apos;t work well here: they already have
        treatments, and this tool looks for a hidden cure where there isn&apos;t one yet.
      </p>
      <p className="audience">
        <strong>About 7,000 known diseases are rare</strong>, and most of them have no approved treatment yet. Open Targets
        lists about 47,000 diseases and conditions. You can type most rare ones into the search box. If a very rare disease
        isn&apos;t in the database, the agent will honestly say it found no match.
      </p>
      <p className="small muted" style={{ marginBottom: 6 }}>Try one of these rare diseases:</p>
      <div className="examples">
        {EXAMPLES.map((x) => (
          <button key={x.name} className="example" onClick={() => search(x.name)} disabled={busy}>
            <strong>{x.name}</strong>
            <span>{x.plain}</span>
          </button>
        ))}
      </div>

      {steps.length > 0 && (
        <div className="card">
          <h3>What the agent is doing</h3>
          <ul className="steps">
            {steps.map((s, i) => <li key={i} className={s.kind}>{s.text}</li>)}
            {busy && <li className="muted">…</li>}
          </ul>
        </div>
      )}

      {error && <div className="notice">Sorry, something went wrong: {error}</div>}

      {answer && <Answer answer={answer} />}

      <WhatItSearches />
    </>
  );
}

const ICON = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const DATABASES = [
  {
    name: "PubMed", big: "41.3M", unit: "research papers", what: "Medical research papers, going back decades",
    icon: <svg {...ICON}><path d="M6 3h9l3 3v15H6z" /><path d="M15 3v3h3M9 11h6M9 14h6M9 17h4" /></svg>,
  },
  {
    name: "ClinicalTrials.gov", big: "609K", unit: "clinical trials", what: "Trials registered from around the world",
    icon: <svg {...ICON}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9zM9 13l2 2 4-4" /></svg>,
  },
  {
    name: "openFDA", big: "263K", unit: "medicine labels", what: "Official US labels and safety warnings",
    icon: <svg {...ICON}><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg>,
  },
  {
    name: "Open Targets", big: "34M", unit: "pieces of evidence", what: "Links between ~79K proteins, ~47K diseases and ~22K medicines",
    icon: <svg {...ICON}><circle cx="6" cy="7" r="2.5" /><circle cx="18" cy="7" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M8.5 7h7M7.3 9.2l3.5 6.6M16.7 9.2l-3.5 6.6" /></svg>,
  },
];

function WhatItSearches() {
  return (
    <section>
      <h2>What the agent searches</h2>
      <p>
        Every search uses four free, public science databases. The agent doesn&apos;t read all of them: it asks targeted
        questions and pulls out the few dozen most relevant records, each with a source.
      </p>
      <div className="db-grid">
        {DATABASES.map((d) => (
          <div key={d.name} className="db-card">
            <div className="db-icon">{d.icon}</div>
            <div className="db-big">{d.big}</div>
            <div className="db-unit">{d.unit}</div>
            <div className="db-name">{d.name}</div>
            <div className="db-what">{d.what}</div>
          </div>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>
        Sizes checked in October 2026. In our tests, each search took about 45 seconds and pulled about 41 records from these databases.
      </p>
    </section>
  );
}

function Answer({ answer }: { answer: FinalAnswer }) {
  return (
    <>
      <h2>Medicines worth a closer look</h2>
      {answer.overall && <p>{answer.overall}</p>}
      {answer.drugs.length === 0 ? (
        <div className="notice">The agent couldn&apos;t find an approved medicine with enough evidence for this disease. That&apos;s an honest &ldquo;no&rdquo;, not an error.</div>
      ) : answer.thin_evidence ? (
        <div className="notice">The agent found only weak evidence for this disease. Treat these as very early ideas.</div>
      ) : null}
      {answer.drugs.map((d) => <DrugCard key={d.drug_id} d={d} disease={answer.disease} />)}
      <p className="small muted">Ideas for researchers to check, not treatment advice. Always talk to a doctor.</p>
    </>
  );
}

function DrugCard({ d, disease }: { d: DrugMatch; disease: string }) {
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const vote = (rating: "up" | "down") => { setVoted(rating); trackFeedback({ disease, drug: d.name, rating }); };
  return (
    <div className="card">
      <div className="drug-head">
        <h3>#{d.rank} {cap(d.name)}</h3>
        <span>
          {d.already_approved_here && <span className="badge already" style={{ marginRight: 6 }}>Already approved for this disease</span>}
          <span className={`badge ${d.strength}`}>{d.strength === "Some" ? "Some evidence" : `${d.strength} evidence`}</span>
        </span>
      </div>
      <p className="small muted">Approved today for: {d.approved_for}</p>
      <p style={{ marginBottom: 0 }}><strong>Why it might help:</strong></p>
      <ol className="reasons">
        {d.steps.map((s, i) => (
          <li key={i}>
            {s.text}
            {s.sources.map((src, j) => (
              <a key={j} className="cite" href={src.url} target="_blank" rel="noreferrer" title={src.label}>[{sourceName(src.id)}]</a>
            ))}
          </li>
        ))}
      </ol>
      {d.safety_note && d.safety_source && (
        <p className="safety">
          <strong>Safety note from the FDA label:</strong> {d.safety_note}
          <a className="cite" href={d.safety_source.url} target="_blank" rel="noreferrer">[FDA label]</a>
        </p>
      )}
      <div className="feedback">
        Was this useful?
        <button onClick={() => vote("up")} disabled={!!voted} aria-label="Useful">👍</button>
        <button onClick={() => vote("down")} disabled={!!voted} aria-label="Not useful">👎</button>
        {voted && <span>Thanks!</span>}
      </div>
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function sourceName(id: string) {
  if (id.startsWith("PMID:")) return "PubMed";
  if (id.startsWith("NCT")) return "Trial";
  if (id.startsWith("FDA:")) return "FDA label";
  return "Open Targets";
}
