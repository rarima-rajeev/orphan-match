# Orphan Match — "The hidden cure" · PLAN (waiting for your approval)

## 1. One-line pitch
Type or say the name of a rare disease. An AI agent searches 4 free public science databases on its own and returns a short, ranked list of **already-approved drugs** that researchers might look at — with a reason and a source for every step.

**Headline AI PM skill:** a real tool-using **agent** (Gemini decides which tool to call, in what order, and when to stop).
**Interview talking point:** Phase Zero is a *fixed pipeline* (code decides every step). Orphan Match is an *agent* (the model decides the steps). Same industry, opposite design — and I can explain when to pick which.

## 2. Plain-language glossary (for you, and reused on the site)
| Term | Simple meaning |
|---|---|
| Rare / orphan disease | A disease so uncommon that few companies make drugs for it. ~7,000 exist; most have no approved treatment. |
| Target | A protein in the body that a drug "grabs" to change how it works. |
| Repurposing | Using a drug already approved for one disease to treat a different one. Faster and cheaper, because safety is already known. |
| Agent | An AI that is given tools and a goal, and chooses its own next step until it decides it's done. |
| Tool call | The AI asking a database a question (e.g. "which proteins are linked to this disease?"). |
| Citation | A link back to the exact database record that supports a claim. |

## 3. How it works (build plan)
| Step | What happens | Who decides | AI/PM concept |
|---|---|---|---|
| 1 | Visitor types or speaks a disease (mic uses the browser's free speech-to-text) | Visitor | Low-friction input, accessibility |
| 2 | Gemini gets the question + 4 tools | Code | Function calling |
| 3 | Gemini picks a tool, reads the result, picks the next one… | **Gemini** | Agent loop / planning |
| 4 | Each step shows live on screen ("Searching Open Targets… found 12 proteins") | Code | Transparency builds trust |
| 5 | Gemini decides it has enough, writes the ranked list | **Gemini** | Stopping decision |
| 6 | Code checks every drug and citation really came from a tool result; anything else is removed | Code | Guardrail / grounding check |
| 7 | Visitor gives 👍/👎 (PostHog hook, does nothing until PostHog is wired at the end) | Visitor | Feedback loop |

**The 4 tools (all free, no keys):**
1. **Open Targets** — disease → linked proteins → approved drugs that act on them
2. **ClinicalTrials.gov** — has this drug already been tested for this disease?
3. **PubMed** — research papers that support the link
4. **openFDA** — the drug's official label safety warnings

**Guardrails (enforced in code, not just asked of the AI):**
- Max **12 tool calls** per question; then the agent must answer with what it has.
- Only drugs that appeared in a tool result can be shown. Only real IDs/links from tool results can be cited.
- If evidence is thin, the answer says so ("Weak evidence — only 1 source").
- Only **approved** drugs (Open Targets phase 4).
- Footer on every answer: "Ideas for researchers to check — not treatment advice."

**Stack:** Next.js + TypeScript, `gemini-3.8-flash` (current stable Flash), no database. Runs locally tonight; no GitHub/deploy until you ask.

## 4. The eval — "time-travel test"
- **20 famous repurposing successes** (e.g. thalidomide → multiple myeloma, sildenafil → pulmonary arterial hypertension, rituximab → … ). Final list shown to you before running.
- For each case we **pretend it's the year before the discovery**: the tools hide that drug–disease pair (removed from Open Targets drug lists and trial results; PubMed limited to papers before that year).
- **Score = how many times the real drug lands in the agent's top 10.**
- **Comparison row (free, no AI):** a simple fixed rule — "rank drugs by how strongly their protein is linked to the disease." Shows whether the agent beats a dumb baseline. *(Recommend yes — costs ₹0.)*
- **Honest limits we will state:** Gemini was trained on today's internet, so it may "remember" the answer (leakage). Open Targets' protein–disease links also use today's science. So the score is an **upper bound**, not proof.
- **Budget:** each run logs tokens; script stops if spend nears ₹300. Expected well under ₹150.

## 5. Scope lock
Exactly 3 pages. Anything new goes to the **Later** list below, not into the build.
**Later:** deploy to Vercel · PostHog wiring · more eval cases · drug–drug interaction check · save/share results.

## 6. Questions for you
1. Approve the wording below as-is (or tell me edits)?
2. Include the free baseline comparison row? (recommend **yes**)
3. 12 tool calls max per question OK?

---

# EXACT PAGE WORDING

Nav (all pages): **Orphan Match** · Find a match · How the agent works · Results & decisions

## Page 1 — Find a match

**Title:** The hidden cure
**Subtitle:** Some rare diseases may already have a treatment — sitting in a drug approved for something else. Name a rare disease and an AI agent will search four public science databases to look for one.

**Input placeholder:** e.g. Castleman disease
**Buttons:** 🎤 Speak · Find matches
**Mic hint (if browser has no speech support):** Voice input isn't available in this browser — please type instead.
**Example chips:** Try: Castleman disease · Fibrodysplasia ossificans progressiva · Erdheim–Chester disease

**Live panel heading:** What the agent is doing
**Live step examples:**
- Looking up the disease in Open Targets…
- Found 12 proteins linked to this disease
- Checking approved drugs that act on these proteins…
- Searching ClinicalTrials.gov for past trials…
- Reading PubMed for supporting papers…
- Checking FDA label warnings…
- Agent decided it has enough evidence (7 of 12 steps used)

**Results heading:** Drugs worth a closer look
**Each result card:**
- **#1 Drug name** — approved for: *[original use]*
- **Why it might help:**
  1. This drug acts on *[protein]*. [source]
  2. *[Protein]* is linked to *[disease]*. [source]
  3. *[Trial or paper finding, if any]*. [source]
- **Evidence strength:** Strong / Some / Weak
- **Safety note from FDA label:** *[short warning]* [source]
- Was this useful? 👍 👎

**Thin-evidence message:** The agent found only weak evidence for this disease. Treat these as very early ideas.
**No-result message:** The agent couldn't find an approved drug with enough evidence for this disease. That's an honest "no", not an error.
**Footer (every answer):** Ideas for researchers to check — not treatment advice. Always talk to a doctor.

## Page 2 — How the agent works

**Title:** How the agent works
**Intro:** Most software follows a fixed recipe. This one doesn't. The AI is given four tools and a goal, and it chooses its own next step — like a researcher deciding which library to visit next.

**Diagram:** (one simple picture) Question → **Gemini thinks** → picks a tool (Open Targets · ClinicalTrials.gov · PubMed · openFDA) → reads the result → back to **Gemini thinks** → "enough evidence?" → yes → ranked answer → **safety check** → you.

**The four tools**
| Tool | What it answers |
|---|---|
| Open Targets | Which proteins are linked to this disease, and which approved drugs act on them? |
| ClinicalTrials.gov | Has anyone already tested this drug for this disease? |
| PubMed | Are there research papers supporting the link? |
| openFDA | What safety warnings are on the drug's official label? |

**What the code decides vs what the AI decides**
| The code decides (fixed rules) | Gemini decides (judgment) |
|---|---|
| Which 4 tools exist | Which tool to use next |
| Max 12 tool calls per question | What to search for |
| Only approved drugs are allowed | When it has enough evidence |
| Every drug and source must come from a tool result — anything else is removed | How to rank the drugs and explain why |

**Why an agent here?** Every rare disease is different. For one, the best clue is a protein; for another, it's an old trial. A fixed recipe would waste steps or miss clues. The trade-off: agents are less predictable, so the guardrails above matter.

## Page 3 — Results & decisions

**Title:** Results & decisions

**Section: The time-travel test**
We took 20 drugs that are now famous for treating a disease they weren't made for — like thalidomide for multiple myeloma. For each one, we hid the answer: the tools pretend that drug–disease link was never found. Then we asked: does the agent still put the real drug in its top 10?

**Score line:** The agent found the real drug in its top 10 for **X of 20** cases. A simple fixed rule (no AI) found **Y of 20**.

**Table:** Disease · Hidden drug · Agent rank · Baseline rank · Hit/Miss

**Examples:** one hit and one miss, each in 2–3 plain sentences explaining why.

**Section: Honest limits**
- **The AI may remember the answer.** Gemini learned from today's internet, where these success stories are famous. We hide the answer from the tools, but we can't erase it from the AI's memory. So this score is a best case, not proof.
- **The databases know today's science.** The protein–disease links in Open Targets include discoveries made after each drug was repurposed.
- **20 cases is small.** It shows the idea works, not how often.
- **Ideas for researchers to check, not treatment advice.**

**Section: Key decisions**
| Decision | Why |
|---|---|
| Agent, not fixed pipeline | Each rare disease needs a different search path |
| Hard cap of 12 tool calls | Keeps cost and wait time predictable |
| Code checks every citation | AI can invent sources; code can't be talked out of a rule |
| Approved drugs only | Repurposing is only fast if safety is already known |
| Show every step live | People trust what they can watch |

**Section: What's next**
More test cases · test with a model that has an older training cutoff to reduce leakage · ask rare-disease researchers to rate the suggestions.
