---
name: skill-builder
description: Turn a repetitive multi-step workflow into a reusable personal Cursor skill. Use when the user wants to create a skill, save a workflow as a skill, or turn their process into SKILL.md.
---

# Skill Builder

Turn **the user's** repetitive workflow into a focused Cursor skill. Do not copy someone else's private workflow.

## Interview first

Ask only questions that would materially change the workflow. If the process is long, interview in short rounds.

Cover:

- The result they need and what should trigger the skill
- Starting inputs, source files, links, or messages
- The ordered steps they currently follow
- Apps, browser sessions, plugins, local files, or connected services
- Decisions the skill may make alone vs choices it must ask
- Approval gates, especially before sending, publishing, purchasing, deleting, sharing, or changing external data
- The exact finished output and how to verify it
- Common failures, missing dependencies, and what the skill must never do
- Privacy rules, confidential data, or credentials that must stay outside the shareable `SKILL.md`

## Propose, then wait

Restate the proposed workflow in order. Separate read-only steps from actions that change external systems. Call out ambiguous, unsafe, or contradictory instructions. **Ask the user to approve the final workflow before building it.**

## Build after approval

Create a skill folder:

- Personal / all projects: `~/.cursor/skills/<name>/SKILL.md`
- This repo: `.cursor/skills/<name>/SKILL.md`

Frontmatter must include `name` (matches the folder) and a `description` with trigger phrases and when to use it.

The finished skill must:

- Have clear trigger phrases and a narrow scope
- Use tools actually available in this environment
- Preserve every approval gate the user specified
- Never store passwords, API keys, tokens, or private credentials inside shareable `SKILL.md`
- Stop and explain a missing dependency instead of pretending a step succeeded
- Verify the final output and report any step it could not complete
- Avoid personal names, private paths, account details, and org-specific data unless the user explicitly keeps them in their private copy
- Contain no unfinished placeholders
- Keep `SKILL.md` concise; put long details in `references/` and helpers in `scripts/`

## Test

Test with one realistic example that does **not** send, publish, delete, purchase, or expose private information.

Then show: skill name, triggers, dependencies, install location, files created, and test result. Ask for any final enablement the environment requires.
---
