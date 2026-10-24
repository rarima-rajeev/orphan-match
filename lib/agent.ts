// The agent loop. Gemini decides which tool to call next and when to stop.
// The code only enforces the rules: a step cap, and "every claim must cite a real tool result".
import {
  Source,
  TimeTravel,
  ToolContext,
  diseaseProteins,
  fdaWarnings,
  findDisease,
  proteinDrugs,
  searchPubmed,
  searchTrials,
} from "./tools";

export const MODEL = "gemini-3.8-flash";
export const MAX_TOOL_CALLS = 12;

export type AgentEvent =
  | { type: "step"; text: string; tool?: string; n?: number }
  | { type: "answer"; answer: FinalAnswer }
  | { type: "error"; text: string };

export type Step = { text: string; sources: Source[] };
export type DrugMatch = {
  rank: number;
  drug_id: string;
  name: string;
  approved_for: string;
  already_approved_here: boolean;
  steps: Step[];
  strength: "Strong" | "Some" | "Weak";
  safety_note?: string;
  safety_source?: Source;
};
export type FinalAnswer = {
  disease: string;
  overall: string;
  thin_evidence: boolean;
  drugs: DrugMatch[];
  tool_calls: number;
  removed_claims: number;
  usage: { input: number; output: number };
};

const s = (description: string) => ({ type: "STRING", description });
const TOOLS = [
  {
    name: "find_disease",
    description: "Open Targets: look up a disease by name and get its disease_id. Start here.",
    parameters: { type: "OBJECT", properties: { name: s("Disease name") }, required: ["name"] },
  },
  {
    name: "disease_proteins",
    description: "Open Targets: the proteins (targets) most strongly linked to a disease, with a link score 0-1.",
    parameters: { type: "OBJECT", properties: { disease_id: s("e.g. MONDO_0009693") }, required: ["disease_id"] },
  },
  {
    name: "protein_drugs",
    description: "Open Targets: approved drugs that act on one protein, what they do, and what they are approved for.",
    parameters: { type: "OBJECT", properties: { protein_id: s("Ensembl id, e.g. ENSG00000141510") }, required: ["protein_id"] },
  },
  {
    name: "search_trials",
    description: "ClinicalTrials.gov: trials that tested a drug for a disease.",
    parameters: { type: "OBJECT", properties: { drug: s("Drug name"), disease: s("Disease name") }, required: ["drug", "disease"] },
  },
  {
    name: "search_pubmed",
    description: "PubMed: research papers matching a search, e.g. 'sirolimus lymphangioleiomyomatosis' or 'mTOR lymphangioleiomyomatosis'.",
    parameters: { type: "OBJECT", properties: { query: s("PubMed search terms") }, required: ["query"] },
  },
  {
    name: "fda_warnings",
    description: "openFDA: safety warnings from a drug's official US label.",
    parameters: { type: "OBJECT", properties: { drug: s("Generic drug name") }, required: ["drug"] },
  },
  {
    name: "give_answer",
    description: "Finish. Give the ranked list of approved drugs. Call this once you have enough evidence, or when told to stop.",
    parameters: {
      type: "OBJECT",
      properties: {
        disease: s("Disease name used"),
        overall: s("One or two plain sentences on how strong the overall evidence is"),
        thin_evidence: { type: "BOOLEAN", description: "true if evidence is weak overall" },
        drugs: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              drug_id: s("ChEMBL id exactly as returned by protein_drugs"),
              name: s("Drug name"),
              approved_for: s("What it is approved for today, from protein_drugs"),
              strength: { type: "STRING", enum: ["Strong", "Some", "Weak"] },
              steps: {
                type: "ARRAY",
                description: "Reasoning chain, 2-4 short plain-English steps, e.g. 'This drug blocks mTOR.' then 'mTOR is linked to LAM.'",
                items: {
                  type: "OBJECT",
                  properties: {
                    text: s("One plain sentence"),
                    source_ids: { type: "ARRAY", items: { type: "STRING" }, description: "source_id values from tool results" },
                  },
                  required: ["text", "source_ids"],
                },
              },
              safety_note: s("Short plain summary of the FDA label warning, if checked"),
              safety_source_id: s("source_id of the FDA label, if checked"),
            },
            required: ["drug_id", "name", "approved_for", "strength", "steps"],
          },
        },
      },
      required: ["disease", "overall", "thin_evidence", "drugs"],
    },
  },
];

function systemPrompt(maxDrugs: number) {
  return `You are a drug-repurposing research agent. Goal: for the rare disease the user names, find up to ${maxDrugs} ALREADY-APPROVED drugs that might help, ranked best first.
You have tools. You decide which to call, in what order, and when you have enough evidence. You have at most ${MAX_TOOL_CALLS} tool calls, then you must call give_answer.
Good strategy (adapt it): find_disease -> disease_proteins -> protein_drugs on the most promising proteins -> check top candidates with search_trials / search_pubmed -> fda_warnings for the top 1-2 -> give_answer.
Rules:
- Only suggest drugs that appeared in protein_drugs results, using their exact drug_id. Never invent drugs, ids, trials or papers.
- Every step must cite source_ids that appeared in tool results. Uncited claims will be deleted.
- Prefer drugs NOT already approved for this disease (that is the point of repurposing). You may include ones that are, but rank new ideas fairly.
- Don't use your own memory as evidence. If evidence is thin, say so honestly and set thin_evidence true.
- Write steps in plain English a non-scientist can follow. Explain any science word in a few words.
- Before each tool call, say in one short sentence why you are calling it.`;
}

type Part = { text?: string; thought?: boolean; functionCall?: { name: string; args: Record<string, unknown> }; functionResponse?: unknown; thoughtSignature?: string };
type Content = { role: "user" | "model"; parts: Part[] };

async function callGemini(contents: Content[], maxDrugs: number, forceAnswer: boolean) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing");
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt(maxDrugs) }] },
    contents,
    tools: [{ functionDeclarations: TOOLS }],
    toolConfig: {
      functionCallingConfig: forceAnswer ? { mode: "ANY", allowedFunctionNames: ["give_answer"] } : { mode: "ANY" },
    },
    generationConfig: { temperature: 0.2, thinkingConfig: { thinkingLevel: "low" } },
  };
  let last = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body) }
    );
    if (res.ok) return res.json();
    last = `${res.status}: ${(await res.text()).slice(0, 200)}`;
    if (last.includes("spending cap")) throw new Error("The AI is paused right now because its monthly spending limit was reached. Please try again later.");
    if (res.status !== 429 && res.status < 500) throw new Error(`Gemini error ${last}`);
    await new Promise((r) => setTimeout(r, 4000 * 2 ** attempt));
  }
  console.error("Gemini busy:", last);
  throw new Error("Gemini is busy, please try again");
}

const STEP_LABEL: Record<string, (a: Record<string, string>) => string> = {
  find_disease: (a) => `Looking up "${a.name}" in Open Targets…`,
  disease_proteins: () => "Finding proteins linked to this disease (Open Targets)…",
  protein_drugs: () => "Checking approved drugs that act on a protein (Open Targets)…",
  search_trials: (a) => `Searching ClinicalTrials.gov: ${a.drug} for ${a.disease}…`,
  search_pubmed: (a) => `Reading PubMed: "${a.query}"…`,
  fda_warnings: (a) => `Checking FDA label warnings for ${a.drug}…`,
};

async function runTool(ctx: ToolContext, name: string, args: Record<string, string>) {
  switch (name) {
    case "find_disease": return findDisease(ctx, args as { name: string });
    case "disease_proteins": return diseaseProteins(ctx, args as { disease_id: string });
    case "protein_drugs": return proteinDrugs(ctx, args as { protein_id: string });
    case "search_trials": return searchTrials(ctx, args as { drug: string; disease: string });
    case "search_pubmed": return searchPubmed(ctx, args as { query: string });
    case "fda_warnings": return fdaWarnings(ctx, args as { drug: string });
    default: return { error: `Unknown tool ${name}` };
  }
}

type RawDrug = { drug_id: string; name: string; approved_for: string; strength: DrugMatch["strength"]; steps: { text: string; source_ids: string[] }[]; safety_note?: string; safety_source_id?: string };
type RawAnswer = { disease: string; overall: string; thin_evidence: boolean; drugs: RawDrug[] };

// Guardrail: keep only drugs the tools actually returned, and only steps with real citations.
function validate(raw: RawAnswer, ctx: ToolContext, maxDrugs: number) {
  let removed = 0;
  const drugs: DrugMatch[] = [];
  for (const d of raw.drugs || []) {
    if (!ctx.seenDrugs.has(d.drug_id)) { removed++; continue; }
    const steps: Step[] = [];
    for (const st of d.steps || []) {
      const sources = (st.source_ids || []).map((id) => ctx.sources.get(id)).filter(Boolean) as Source[];
      if (sources.length) steps.push({ text: st.text, sources });
      else removed++;
    }
    if (!steps.length) { removed++; continue; }
    const safety = d.safety_source_id ? ctx.sources.get(d.safety_source_id) : undefined;
    drugs.push({
      rank: drugs.length + 1,
      drug_id: d.drug_id,
      name: ctx.seenDrugs.get(d.drug_id)!,
      approved_for: d.approved_for,
      already_approved_here: (ctx.drugApprovedFor.get(d.drug_id) || []).some((id) => ctx.diseaseIds.has(id)),
      steps,
      strength: d.strength,
      safety_note: safety ? d.safety_note : undefined,
      safety_source: safety,
    });
    if (drugs.length >= maxDrugs) break;
  }
  return { drugs, removed };
}

export async function runAgent(
  disease: string,
  emit: (e: AgentEvent) => void,
  opts: { maxDrugs?: number; timeTravel?: TimeTravel } = {}
): Promise<FinalAnswer> {
  const maxDrugs = opts.maxDrugs ?? 5;
  const ctx: ToolContext = { sources: new Map(), seenDrugs: new Map(), drugApprovedFor: new Map(), diseaseIds: new Set(), timeTravel: opts.timeTravel };
  const contents: Content[] = [{ role: "user", parts: [{ text: `Rare disease: ${disease}` }] }];
  const usage = { input: 0, output: 0 };
  let toolCalls = 0;

  for (let turn = 0; turn < MAX_TOOL_CALLS + 3; turn++) {
    const force = toolCalls >= MAX_TOOL_CALLS || turn >= MAX_TOOL_CALLS + 1;
    const data = await callGemini(contents, maxDrugs, force);
    usage.input += data.usageMetadata?.promptTokenCount || 0;
    usage.output += (data.usageMetadata?.candidatesTokenCount || 0) + (data.usageMetadata?.thoughtsTokenCount || 0);
    const content: Content | undefined = data.candidates?.[0]?.content;
    if (!content?.parts?.length) throw new Error("Gemini returned an empty reply");
    contents.push({ role: "model", parts: content.parts });

    for (const p of content.parts) {
      if (p.text && !p.thought && p.text.trim()) emit({ type: "step", tool: "think", text: p.text.trim().slice(0, 300) });
    }
    const calls = content.parts.filter((p) => p.functionCall).map((p) => p.functionCall!);
    const answer = calls.find((c) => c.name === "give_answer");
    if (answer) {
      const raw = answer.args as unknown as RawAnswer;
      const { drugs, removed } = validate(raw, ctx, maxDrugs);
      emit({ type: "step", text: `Agent decided it has enough evidence (${toolCalls} of ${MAX_TOOL_CALLS} steps used)` });
      if (removed) emit({ type: "step", text: `Safety check removed ${removed} claim${removed === 1 ? "" : "s"} without a real source` });
      const final: FinalAnswer = {
        disease: raw.disease || disease,
        overall: raw.overall,
        thin_evidence: raw.thin_evidence || drugs.length === 0 || drugs.every((d) => d.strength === "Weak"),
        drugs,
        tool_calls: toolCalls,
        removed_claims: removed,
        usage,
      };
      emit({ type: "answer", answer: final });
      return final;
    }
    if (!calls.length) {
      contents.push({ role: "user", parts: [{ text: "Please call a tool, or give_answer if you are done." }] });
      continue;
    }

    const responses: Part[] = [];
    for (const c of calls) {
      toolCalls++;
      const args = (c.args || {}) as Record<string, string>;
      emit({ type: "step", tool: c.name, n: toolCalls, text: (STEP_LABEL[c.name] || (() => c.name))(args) });
      let result: Record<string, unknown>;
      try {
        result = await runTool(ctx, c.name, args);
      } catch (e) {
        result = { error: `Tool failed: ${(e as Error).message}` };
      }
      emit({ type: "step", tool: c.name, text: `→ ${(result.summary as string) || (result.error as string) || "done"}` });
      if (toolCalls >= MAX_TOOL_CALLS) result.note = "Step limit reached. Call give_answer now.";
      responses.push({ functionResponse: { name: c.name, response: result } });
    }
    contents.push({ role: "user", parts: responses });
  }
  throw new Error("The agent did not finish");
}
