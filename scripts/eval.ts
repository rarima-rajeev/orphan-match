// Time-travel test. Run: npx tsx --env-file=.env.local scripts/eval.ts  (add --baseline-only to skip Gemini)
// For each famous repurposing success, the tools hide the known answer, then we check
// whether the real drug still lands in the top 10 (agent) — and in a simple no-AI baseline.
import { readFileSync, writeFileSync, existsSync } from "fs";
import { runAgent, MODEL } from "../lib/agent";
import { ToolContext, TimeTravel, diseaseProteins, proteinDrugs } from "../lib/tools";

const USD_IN = 0.75 / 1e6, USD_OUT = 3.75 / 1e6, INR_PER_USD = 88, BUDGET_INR = 280;
const OUT = "data/eval-results.json";

type Case = { drug: string; disease: string; year: number; story: string };
const cases: Case[] = JSON.parse(readFileSync("data/eval-cases.json", "utf8"));
const prior = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { results: [] };
const results: Record<string, unknown>[] = prior.results;
let spentInr = results.reduce((a, r) => a + ((r.cost_inr as number) || 0), 0);

async function ot(query: string, variables: Record<string, unknown>) {
  const r = await fetch("https://api.platform.opentargets.org/api/v4/graphql", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, variables }),
  });
  return (await r.json()).data;
}
const search = async (q: string, entity: string) =>
  (await ot(`query($q:String!,$e:[String!]){ search(queryString:$q, entityNames:$e, page:{index:0,size:3}){ hits{ id name } } }`, { q, e: [entity] })).search.hits;

const newCtx = (tt: TimeTravel): ToolContext => ({ sources: new Map(), seenDrugs: new Map(), drugApprovedFor: new Map(), diseaseIds: new Set(), timeTravel: tt });

// "DABRAFENIB MESYLATE" and "DABRAFENIB" count as the same medicine.
const baseName = (name: string) => name.toUpperCase().split(" ")[0];

// No-AI baseline: rank approved drugs by how strongly their protein is linked to the disease.
async function baseline(diseaseId: string, tt: TimeTravel) {
  const ctx = newCtx(tt);
  const p = await diseaseProteins(ctx, { disease_id: diseaseId });
  const ranked: string[] = [];
  for (const prot of (p as { proteins?: { protein_id: string }[] }).proteins || []) {
    const d = await proteinDrugs(ctx, { protein_id: prot.protein_id });
    for (const drug of (d as { approved_drugs?: { name: string }[] }).approved_drugs || []) {
      const base = baseName(drug.name);
      if (!ranked.includes(base)) ranked.push(base);
    }
  }
  return ranked;
}

async function main() {
  for (const c of cases) {
    if (results.find((r) => r.drug === c.drug && r.disease === c.disease)) continue;
    if (spentInr > BUDGET_INR) { console.log(`Budget reached (₹${spentInr.toFixed(0)}), stopping.`); break; }
    const [dis] = await search(c.disease, "disease");
    const [drug] = await search(c.drug, "drug");
    const tt: TimeTravel = { hiddenDrugId: drug.id, hiddenDrugName: c.drug, hiddenDiseaseName: c.disease, hiddenDiseaseIds: [dis.id], beforeYear: c.year };
    console.log(`\n== ${c.drug} → ${c.disease} (OT: ${dis.name} ${dis.id}; ${drug.name} ${drug.id}; before ${c.year})`);

    const base = await baseline(dis.id, tt);
    const baseRank = base.indexOf(baseName(drug.name)) + 1 || null;

    if (process.argv.includes("--baseline-only")) { console.log(`baseline rank: ${baseRank ?? "miss"} of ${base.length}`); continue; }
    const trace: string[] = [];
    let agentRank: number | null = null, top: string[] = [], toolCalls = 0, usage = { input: 0, output: 0 }, err = "";
    try {
      const ans = await runAgent(c.disease, (e) => { if (e.type === "step") trace.push(e.text); }, { maxDrugs: 10, timeTravel: tt });
      top = [...new Set(ans.drugs.map((d) => baseName(d.name)))];
      agentRank = top.indexOf(baseName(drug.name)) + 1 || null;
      toolCalls = ans.tool_calls;
      usage = ans.usage;
    } catch (e) { err = (e as Error).message; }
    if (err) { console.log("error, will retry this case next run:", err); continue; }
    const cost = (usage.input * USD_IN + usage.output * USD_OUT) * INR_PER_USD;
    spentInr += cost;
    console.log(`agent rank: ${agentRank ?? "miss"} | baseline rank: ${baseRank ?? "miss"} | ${toolCalls} calls | ₹${cost.toFixed(1)} ${err}`);
    console.log("agent top:", top.join(", "));
    results.push({ ...c, ot_disease: dis.name, ot_drug_id: drug.id, agent_rank: agentRank, agent_hit: !!agentRank && agentRank <= 10,
      baseline_rank: baseRank, baseline_hit: !!baseRank && baseRank <= 10, baseline_candidates: base.length,
      agent_top: top, tool_calls: toolCalls, trace, cost_inr: Number(cost.toFixed(2)), error: err || undefined });
    writeFileSync(OUT, JSON.stringify({ model: MODEL, run_date: new Date().toISOString().slice(0, 10), results }, null, 1));
  }
  const n = results.length, a = results.filter((r) => r.agent_hit).length, b = results.filter((r) => r.baseline_hit).length;
  console.log(`\nAgent: ${a}/${n} | Baseline: ${b}/${n} | Spent ₹${spentInr.toFixed(0)}`);
}
main();
