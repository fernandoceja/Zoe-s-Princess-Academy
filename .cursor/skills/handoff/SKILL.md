---
name: handoff
description: Package task context so another AI, another model, or a fresh chat can continue without a recap. Use when the user asks to hand off a task, continue in a fresh chat, get an independent comparison, request a critique or second opinion, escape a huge context window, or reduce repeated context.
---

# Handoff

Create one compact, ready-to-paste packet. The receiving AI must be able to continue **without reading this conversation**.

## When to use

Infer one mode. Ask only if the wrong mode would materially change the result:

- **Continue** — transfer current state so another AI can resume.
- **Independent comparison** — original task, constraints, and sources only. Do **not** include this AI's answer or conclusions.
- **Critique or second opinion** — include the current result and ask the receiver to evaluate it against the goal and evidence.
- **Fresh context** — condense a long thread so work can continue in a new chat.

## Include only what the receiver needs

- The actual objective and requested deliverable
- Current state and work already completed
- Approved decisions, exact wording, constraints, preferences, and definition of done
- Relevant facts, source links, files, paths, data, and examples
- Failed approaches or superseded decisions only when repeating them would waste time or cause an error
- Open questions, unresolved risks, and the exact next action

Preserve important wording exactly. Separate confirmed facts from assumptions. Never invent missing context.

If the receiver cannot access a local file, private link, connected app, or prior attachment, list exactly what the user must attach or paste. Include the essential information directly when it is short and safe.

## Never include

- Passwords, API keys, private credentials, or unrelated personal information
- Greetings, filler, repeated discussion, tool logs, dead ends, and completed steps that no longer affect the work

Summarize large source material. Keep exact language when wording is part of the deliverable.

Do not claim the handoff was delivered unless a tool actually delivered it.

## Packet template

Use only the sections that add value:

```markdown
# Handoff
## Objective
## Deliverable
## Current State
## Decisions and Constraints
## Sources and Files
## Remaining Work
## Continue From Here
```

Write **Continue From Here** as a direct instruction to the receiving AI. Tell it not to repeat completed work and to ask a question only when required information is genuinely missing.
---
