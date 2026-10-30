---
name: remotion
description: Create, edit, caption, preview, or render videos and motion graphics with Remotion. Use when the user asks to make a Remotion video, motion graphic, captioned clip, or render a composition.
---

# Remotion

Use Remotion for video and motion graphics. Choose the relevant Remotion capability automatically. The user does not need to name each bundled skill.

## When to use

- Create a motion graphic or programmatic video
- Edit, caption, map, preview, or render a Remotion composition
- Example: `Using Remotion, create a motion graphic that shows [idea, style, dimensions, and timing].`

## Workflow

1. Confirm idea, style, dimensions, duration, and output format. Ask only if a missing value would block a correct render.
2. Check that Remotion is available (`npx remotion --help` or a local Remotion project). If it is missing, stop and explain how to add it. Do not pretend a render succeeded.
3. Prefer an existing Remotion project in the workspace. If none exists and the user wants one, scaffold the smallest project that fits.
4. Implement the composition in React/Remotion. Keep assets local or clearly referenced.
5. Preview when possible. Render only after the composition is valid.
6. Report the composition name, output path, dimensions, duration, and anything that did not render.

## Guardrails

- Do not upload, publish, or overwrite production assets unless the user asked.
- Do not put API keys or private media URLs in committed files.
- If Remotion or a codec dependency is missing, say exactly what is missing.
- Do not silently switch to a different video tool unless the user asks for a fallback.
---
