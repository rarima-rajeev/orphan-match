// Saves full agent answers (sentences + sources) for a citation spot-check.
// Run: npx tsx --env-file=.env.local scripts/citation-answers.ts
import { writeFileSync } from "fs";
import { runAgent } from "../lib/agent";

const DISEASES = ["Castleman disease", "Lymphangioleiomyomatosis", "Fibrodysplasia ossificans progressiva", "Myotonia congenita", "Erdheim-Chester disease"];

(async () => {
  const out = [];
  for (const d of DISEASES) {
    const ans = await runAgent(d, () => {});
    console.log(d, "→", ans.drugs.map((x) => x.name).join(", "));
    out.push(ans);
  }
  writeFileSync("data/citation-check-answers.json", JSON.stringify(out, null, 1));
})();
