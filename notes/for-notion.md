# Saved for Notion (write up later, when asked)

## Orphan Match: what the code decides vs what the AI decides
(Removed from the "How the agent works" page on 2026-10-27.)

| The code decides (fixed rules) | Gemini decides (judgment) |
|---|---|
| Which 4 tools exist | Which tool to use next |
| At most 12 tool calls per question | What to search for |
| Only approved medicines are allowed | When it has enough evidence |
| Every medicine and source must come from a real tool result. Anything else is removed. | How to rank the medicines and explain why |

## Orphan Match: what the eval really showed (is AI worth it?)
(Discussed 2026-10-27.)

- **No-AI rule** = same 4 tools and same hidden answers, plain code only: take the 15 proteins most linked to the disease, list approved medicines acting on them, rank by link strength. Costs ₹0, a few seconds. The agent costs about ₹4 per question and takes about 15–60 seconds.
- **Scores:** agent 3/20 (15%), no-AI rule 2/20 (10%). Far above random guessing (picking 10 of a few thousand approved medicines), but 3 vs 2 is one case out of 20, so it is not a meaningful difference.
- **Humans vs AI is not a fair contest:** real discoveries came from years of work, real patients and luck (propranolol was spotted by accident in 2008). The agent had 12 searches and about a minute.
- **Conclusion:** as a discovery tool, the eval does not show the AI is worth its cost over a simple rule. AI is not automatically the better option or the better ROI; prove it against a cheap baseline first.
- **Why it's still a good portfolio project:** built the agent → tested it honestly against a baseline → found it didn't clearly win → found where the test leaks (AI memory, today's databases) → said so openly.
- **Where the agent may still add value (not yet measured):** a research assistant that gathers cited evidence quickly. Next eval: researchers' time saved with vs without it, or ratings of its explanations.
- **Interview line:** "My eval showed the agent barely beat a free baseline, 3 vs 2 out of 20, which isn't meaningful. So I wouldn't justify it as a discovery engine. Its likely value is saving researchers time by gathering cited evidence, which is the next thing I'd test. AI isn't automatically the better option. You prove it against a cheap baseline first."

## Future enhancement idea: add machine learning (not now)
(Discussed 2026-10-27. User: not adding ML now; keep as a future enhancement.)

- Idea: a hybrid. A trained ML model quickly scores every disease–medicine pair (milliseconds, near ₹0), then the agent gathers evidence and explains only the top picks.
- Could raise or lower the score; not guaranteed.
- Risks: only a few hundred documented repurposing successes to learn from (small data); leakage (must train only on data from before each discovery year, or the backtest is meaningless); ML scores don't explain *why*.
- Interview line: "I'd add an ML model to rank candidates quickly and cheaply, trained only on data from before each discovery to avoid leakage, and keep the agent for gathering evidence and explaining. Then I'd re-run the same backtest to see whether it actually beats 3 of 20."

## Orphan Match: cost comparison (traditional IT project vs AI-assisted, one person)
(Discussed 2026-10-27. Rough estimates from typical industry rates, not quotes. Gemini spend calculated from token counts.)

### What it actually cost
- Gemini: ~₹200 (about $2.50): 2 test runs, citation check, pictures, trial searches.
- Claude: part of the Claude subscription (not counted).
- Time: ~2–3 days, one person. People hired: 0.

### Traditional prototype team (~6 weeks, US rates)
| Role | Time | Rate | Cost |
|---|---|---|---|
| Product manager | half-time, 6 weeks | $80/h | ~$9,600 |
| 2 software engineers | 6 weeks | $90/h | ~$43,200 |
| Data/ML scientist (test design) | 3 weeks | $100/h | ~$12,000 |
| Pharma expert | 1 week | $150/h | ~$6,000 |
| Designer / illustrator | 2 weeks | $75/h | ~$6,000 |
| Tester (QA) | 2 weeks | $60/h | ~$4,800 |
| Total salaries | | | ~$80,000 (range $60k–100k); India-based team ~$15k–30k |

### A. Building the prototype
| Cost type | Traditional | You + Claude + Gemini |
|---|---|---|
| Salaries | ~$80,000 | Your time |
| Employer overheads (+25–40%) | ~$20,000–30,000 | $0 |
| Software and tools | ~$1,000–3,000 | Claude plan |
| Cloud for dev/testing | ~$300–1,000 | $0 |
| AI usage | ~$50–200 | ~$2.50 |
| Data | $0 with free databases; commercial pharma databases ~$50k–200k+/year | $0 |
| Total | ~$100k–115k | ~$3 + Claude plan |

### B. Launching to the public
| Cost type | Traditional | Our project |
|---|---|---|
| Production engineering | ~$20k–40k | Still needed (Claude helps, needs review) |
| Security review | ~$5k–15k | Basic review; professional optional |
| Legal and compliance | ~$3k–10k | ~$500–2,000 |
| Pharma expert sign-off | ~$5k–10k | Still needed for a real product |
| Domain and hosting setup | ~$100 | ~$12/year + Vercel free tier |
| Launch marketing | ~$10k–50k+ | Portfolio: LinkedIn post, demo video, ~$0 |
| Total | ~$45k–125k | ~$0–3k |

### C. Running it for a year
| Cost type | Traditional | Our project |
|---|---|---|
| Hosting | ~$1k–5k | $0–240 |
| AI usage (~1,000 searches/month at ~₹4) | similar | ~$45/month, ~$550/year |
| Analytics | ~$0–2k | free tier |
| Maintenance (~20% of build/year) | ~$15k–25k | your time + Claude |
| Customer support | ~$5k+ | n/a |
| Total | ~$20k–35k | ~$600–800 |

### Summary (first year)
| | Traditional | You + Claude + Gemini |
|---|---|---|
| Prototype | ~$100k–115k | ~$3 + Claude plan |
| Launch | ~$45k–125k | ~$0–3k |
| Year 1 running | ~$20k–35k | ~$600–800 |
| Total | ~$165k–275k | ~$1k–4k + Claude plan |

### Honest points
- Free public data is a hidden saving; many pharma teams pay heavily for commercial drug databases.
- AI doesn't remove expert science review, legal checks or production security; it makes them cheaper, not zero.
- Not apples to apples: the traditional team would also deliver expert review, production engineering, accessibility and legal review.

### Interview line
"Counting salaries, overheads, tools, launch and a year of running costs, a traditional team might spend roughly $165k–275k in the first year. My AI-assisted prototype cost under $5 to build, and running it would cost about $50 a month. The parts AI can't replace are expert review, legal and security, so that's where I'd spend the money if it went to production."

## Orphan Match: user-side ROI (savings for researchers who use the tool)
(Discussed 2026-10-28. Adds to the builder-side cost comparison above. Rough estimates, not quotes.)

**Framing:** present it as researcher time freed (capacity), not "fewer researchers". Our tests show a human must still check answers (citations: 12 of 20 fully supported; hit rate 3–4 of 20). Headcount savings only at large scale; companies usually redeploy people.

### Per disease
| | By hand | With the agent |
|---|---|---|
| Desk research | ~1–2 hours | ~45 seconds |
| Checking the answer | n/a | ~20–30 minutes |
| Net time saved | | ~0.5–1.5 hours |
| Value (US researcher fully loaded ~$75–100/hour) | | ~$40–150 per disease |
| Tool cost | | ~₹4 (about $0.05) |

### At scale, per year
| Who | Diseases screened | Hours freed | Value | Equivalent |
|---|---|---|---|---|
| Small rare-disease team / patient group | ~200 | ~100–300 | ~$7,500–30,000 | ~0.1 researcher |
| Mid-size pharma research unit | ~2,000 | ~1,000–3,000 | ~$75,000–300,000 | ~0.5–1.5 researchers |
| All ~7,000 rare diseases, once | ~7,000 | ~3,500–10,500 | ~$260,000–1,000,000 | one-time screening project |

### Tool savings (be careful)
- Pharma teams often pay $50,000–200,000+/year for commercial drug databases.
- This tool uses free public data but would NOT fully replace them (they hold curated and private data). Realistic claim: might reduce some licence seats or speed up early checks. No firm number.

### Hidden costs on the user side
- Wrong leads cost money: chasing a weak suggestion into a lab experiment can cost weeks and $10,000+. Hence "Weak evidence" labels and honest "no match" answers.
- Review time (counted above).

### Unquantifiable upside
If it ever helps find a real treatment even a year earlier, the patient value is enormous, but too uncertain to put a number on. Mention as potential only.

### Interview line
"On the user side, the agent turns 1–2 hours of desk research into under a minute plus about 20 minutes of checking. For a pharma unit screening 2,000 diseases a year, that frees roughly 1,000–3,000 researcher hours, worth about $75k–300k, for under $100 in AI costs. I'd present that as capacity freed, not jobs cut, because our tests show a human still has to check the answers."
