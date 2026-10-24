// Quick manual test: npx tsx --env-file=.env.local scripts/try.ts "disease name"
import { runAgent } from "../lib/agent";
runAgent(process.argv[2] || "lymphangioleiomyomatosis", (e) => {
  if (e.type === "step") console.log("·", e.text);
  else if (e.type === "answer") console.log(JSON.stringify(e.answer, null, 1).slice(0, 4000));
}).catch((e) => console.error("ERR", e.message));
