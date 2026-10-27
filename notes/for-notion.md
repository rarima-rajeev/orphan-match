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
