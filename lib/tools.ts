// The 4 free public data tools the agent can call.
// Every result item carries a source id; the agent may only cite ids it has seen.

export type Source = { id: string; label: string; url: string };

// "Time-travel" settings, used only by the eval: hide one known drug–disease answer.
export type TimeTravel = {
  hiddenDrugId: string; // ChEMBL id, e.g. CHEMBL468
  hiddenDrugName: string;
  hiddenDiseaseName: string;
  hiddenDiseaseIds: string[];
  beforeYear: number; // only evidence dated before this year
};

export type ToolContext = {
  sources: Map<string, Source>;
  seenDrugs: Map<string, string>; // ChEMBL id -> name, from Open Targets results
  drugApprovedFor: Map<string, string[]>; // ChEMBL id -> disease ids it is approved for
  diseaseIds: Set<string>; // diseases the agent looked at
  timeTravel?: TimeTravel;
};

const OT_URL = "https://api.platform.opentargets.org/api/v4/graphql";

async function getJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${new URL(url).host} returned ${res.status}`);
  return res.json();
}

async function ot(query: string, variables: Record<string, unknown>) {
  const data = await getJson(OT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (data.errors) throw new Error(data.errors[0].message);
  return data.data;
}

function addSource(ctx: ToolContext, s: Source) {
  ctx.sources.set(s.id, s);
  return s.id;
}

function mentionsHiddenDisease(text: string, tt?: TimeTravel) {
  if (!tt) return false;
  return text.toLowerCase().includes(tt.hiddenDiseaseName.toLowerCase());
}

// ① Open Targets: find the disease id
export async function findDisease(ctx: ToolContext, args: { name: string }) {
  const d = await ot(
    `query($q:String!){ search(queryString:$q, entityNames:["disease"], page:{index:0,size:5}){ hits{ id name description } } }`,
    { q: args.name }
  );
  const hits = d.search.hits.map((h: { id: string; name: string; description?: string }) => ({
    disease_id: h.id,
    name: h.name,
    description: (h.description || "").slice(0, 200),
    source_id: addSource(ctx, {
      id: `OT:${h.id}`,
      label: `Open Targets: ${h.name}`,
      url: `https://platform.opentargets.org/disease/${h.id}`,
    }),
  }));
  return { hits, summary: `found ${hits.length} matching disease${hits.length === 1 ? "" : "s"}` };
}

// In the time-travel test, protein links from drug trials, text-mined papers and
// drug-response biomarkers are switched off, because they contain the hidden answer.
const LEAKY_SOURCES = ["clinical_precedence", "europepmc", "cancer_biomarkers"];

// ① Open Targets: proteins linked to the disease
export async function diseaseProteins(ctx: ToolContext, args: { disease_id: string }) {
  const datasources = ctx.timeTravel
    ? LEAKY_SOURCES.map((id) => ({ id, weight: 0, propagate: true, required: false }))
    : null;
  const d = await ot(
    `query($id:String!, $ds:[DatasourceSettingsInput!]){ disease(efoId:$id){ name
      associatedTargets(page:{index:0,size:15}, datasources:$ds){ count rows{ score target{ id approvedSymbol approvedName } } } } }`,
    { id: args.disease_id, ds: datasources }
  );
  if (!d.disease) return { error: "No disease with that id. Use find_disease first." };
  ctx.diseaseIds.add(args.disease_id);
  const proteins = d.disease.associatedTargets.rows.map(
    (r: { score: number; target: { id: string; approvedSymbol: string; approvedName: string } }) => ({
      protein_id: r.target.id,
      symbol: r.target.approvedSymbol,
      name: r.target.approvedName,
      link_score: Number(r.score.toFixed(2)),
      source_id: addSource(ctx, {
        id: `OT:${args.disease_id}:${r.target.id}`,
        label: `Open Targets: ${r.target.approvedSymbol} ↔ ${d.disease.name}`,
        url: `https://platform.opentargets.org/evidence/${r.target.id}/${args.disease_id}`,
      }),
    })
  );
  return {
    disease: d.disease.name,
    total_linked: d.disease.associatedTargets.count,
    proteins,
    summary: `found ${proteins.length} top proteins (of ${d.disease.associatedTargets.count} linked)`,
  };
}

type OtDrugRow = {
  maxClinicalStage: string;
  drug: {
    id: string;
    name: string;
    maximumClinicalStage: string;
    mechanismsOfAction: { rows: { mechanismOfAction: string }[] } | null;
    indications: { rows: { maxClinicalStage: string; disease: { id: string; name: string } | null }[] } | null;
  };
};

// ① Open Targets: approved drugs that act on a protein
export async function proteinDrugs(ctx: ToolContext, args: { protein_id: string }) {
  const d = await ot(
    `query($id:String!){ target(ensemblId:$id){ approvedSymbol drugAndClinicalCandidates{ rows{ maxClinicalStage
      drug{ id name maximumClinicalStage mechanismsOfAction{ rows{ mechanismOfAction } }
        indications{ rows{ maxClinicalStage disease{ id name } } } } } } } }`,
    { id: args.protein_id }
  );
  if (!d.target) return { error: "No protein with that id. Use disease_proteins first." };
  const tt = ctx.timeTravel;
  const seen = new Set<string>();
  const drugs = (d.target.drugAndClinicalCandidates?.rows || [])
    .filter((r: OtDrugRow) => r.drug && r.drug.maximumClinicalStage === "APPROVAL")
    .filter((r: OtDrugRow) => !seen.has(r.drug.id) && seen.add(r.drug.id))
    .slice(0, 15)
    .map((r: OtDrugRow) => {
      ctx.seenDrugs.set(r.drug.id, r.drug.name);
      const approved = (r.drug.indications?.rows || [])
        .filter((i) => i.maxClinicalStage === "APPROVAL" && i.disease)
        .filter((i) => !(tt && r.drug.id === tt.hiddenDrugId && (tt.hiddenDiseaseIds.includes(i.disease!.id) || mentionsHiddenDisease(i.disease!.name, tt))));
      ctx.drugApprovedFor.set(r.drug.id, approved.map((i) => i.disease!.id));
      const approvedFor = approved.map((i) => i.disease!.name).slice(0, 5);
      return {
        drug_id: r.drug.id,
        name: r.drug.name,
        how_it_works: r.drug.mechanismsOfAction?.rows[0]?.mechanismOfAction || "unknown",
        approved_for: approvedFor,
        source_id: addSource(ctx, {
          id: `OT:${r.drug.id}`,
          label: `Open Targets: ${r.drug.name} acts on ${d.target.approvedSymbol}`,
          url: `https://platform.opentargets.org/drug/${r.drug.id}`,
        }),
      };
    });
  return {
    protein: d.target.approvedSymbol,
    approved_drugs: drugs,
    summary: `found ${drugs.length} approved drug${drugs.length === 1 ? "" : "s"} acting on ${d.target.approvedSymbol}`,
  };
}

// True when the agent asks about the exact drug–disease pair the eval is hiding.
function isHiddenPair(drug: string, disease: string, tt?: TimeTravel) {
  if (!tt) return false;
  const dr = drug.toLowerCase();
  const h = tt.hiddenDrugName.toLowerCase();
  const words = tt.hiddenDiseaseName.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
  return (dr.includes(h) || h.includes(dr)) && words.some((w) => disease.toLowerCase().includes(w));
}

// ② ClinicalTrials.gov: has this drug been tried for this disease?
export async function searchTrials(ctx: ToolContext, args: { drug: string; disease: string }) {
  const tt = ctx.timeTravel;
  if (isHiddenPair(args.drug, args.disease, tt)) {
    return { total: 0, trials: [], summary: "found 0 trials" };
  }
  const url =
    `https://clinicaltrials.gov/api/v2/studies?format=json&countTotal=true&pageSize=10` +
    `&query.cond=${encodeURIComponent(args.disease)}&query.intr=${encodeURIComponent(args.drug)}` +
    `&fields=NCTId,BriefTitle,OverallStatus,StartDate,Phase`;
  const data = await getJson(url);
  type Study = { protocolSection: { identificationModule: { nctId: string; briefTitle: string }; statusModule?: { overallStatus?: string; startDateStruct?: { date?: string } }; designModule?: { phases?: string[] } } };
  let studies: Study[] = data.studies || [];
  if (tt) {
    studies = studies.filter((s) => {
      const y = parseInt(s.protocolSection.statusModule?.startDateStruct?.date?.slice(0, 4) || "9999");
      return y < tt.beforeYear;
    });
  }
  const trials = studies.slice(0, 5).map((s) => {
    const p = s.protocolSection;
    return {
      trial_id: p.identificationModule.nctId,
      title: p.identificationModule.briefTitle,
      status: p.statusModule?.overallStatus,
      started: p.statusModule?.startDateStruct?.date,
      phase: p.designModule?.phases?.join(", "),
      source_id: addSource(ctx, {
        id: p.identificationModule.nctId,
        label: `ClinicalTrials.gov ${p.identificationModule.nctId}: ${p.identificationModule.briefTitle}`,
        url: `https://clinicaltrials.gov/study/${p.identificationModule.nctId}`,
      }),
    };
  });
  const total = tt ? trials.length : data.totalCount ?? trials.length;
  return { total, trials, summary: `found ${total} trial${total === 1 ? "" : "s"}` };
}

// ③ PubMed: supporting papers
export async function searchPubmed(ctx: ToolContext, args: { query: string }) {
  const tt = ctx.timeTravel;
  const base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
  const dates = tt ? `&datetype=pdat&mindate=1800&maxdate=${tt.beforeYear - 1}` : "";
  const s = await getJson(
    `${base}/esearch.fcgi?db=pubmed&retmode=json&retmax=5&sort=relevance&term=${encodeURIComponent(args.query)}${dates}`
  );
  const ids: string[] = s.esearchresult?.idlist || [];
  const count = parseInt(s.esearchresult?.count || "0");
  if (!ids.length) return { total: 0, papers: [], summary: "found 0 papers" };
  const sum = await getJson(`${base}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`);
  const papers = ids.map((id) => {
    const r = sum.result?.[id] || {};
    return {
      pmid: id,
      title: r.title,
      year: (r.pubdate || "").slice(0, 4),
      journal: r.source,
      source_id: addSource(ctx, {
        id: `PMID:${id}`,
        label: `PubMed ${id}: ${r.title}`,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      }),
    };
  });
  return { total: count, papers, summary: `found ${count} paper${count === 1 ? "" : "s"}` };
}

// ④ openFDA: label safety warnings
export async function fdaWarnings(ctx: ToolContext, args: { drug: string }) {
  const q = encodeURIComponent(`openfda.generic_name:"${args.drug}"`);
  let data;
  try {
    data = await getJson(`https://api.fda.gov/drug/label.json?search=${q}&limit=1`);
  } catch {
    return { found: false, summary: "no FDA label found" };
  }
  const r = data.results?.[0];
  if (!r) return { found: false, summary: "no FDA label found" };
  const clean = (t?: string[]) => {
    let s = (t?.[0] || "").replace(/\s+/g, " ").slice(0, 500);
    if (ctx.timeTravel) s = s.replace(new RegExp(ctx.timeTravel.hiddenDiseaseName, "gi"), "[hidden]");
    return s;
  };
  return {
    found: true,
    boxed_warning: clean(r.boxed_warning),
    warnings: clean(r.warnings_and_cautions || r.warnings),
    source_id: addSource(ctx, {
      id: `FDA:${r.set_id}`,
      label: `FDA label: ${r.openfda?.brand_name?.[0] || args.drug}`,
      url: `https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${r.set_id}`,
    }),
    summary: r.boxed_warning ? "found a boxed (most serious) warning" : "found label warnings",
  };
}
