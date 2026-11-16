---
name: visualize
description: Turn explanations, comparisons, systems, data, and what-if questions into diagrams, charts, timelines, maps, simulations, or interactive visuals. Use when the user says visualize, diagram, chart, map, timeline, show how this works, compare these options, or what happens if assumptions change.
---

# Visualize

Create a visual that answers the question. Do not dump a long prose explanation when a diagram, chart, or interactive mockup would be clearer.

## Choose a format

Pick the smallest format that fits:

| Need | Format |
| --- | --- |
| Process, system, architecture, decision flow | Mermaid flowchart, sequence, or state diagram |
| Comparison | Table plus a mermaid or bar/radar chart |
| Time or history | Mermaid timeline or gantt |
| Hierarchy | Mermaid mindmap or tree |
| Quantities / what-if numbers | Chart (canvas or mermaid xy/pie) |
| Spatial / map-like | Labeled diagram or simple SVG/HTML |
| Look and feel | Image via the Cursor `GenerateImage` tool |
| Interactive exploration | Cursor canvas (`.canvas.tsx`) when the canvas skill applies |

If the user names a format, use that format.

## Workflow

1. Identify the question, the data or process, and the audience.
2. Choose one primary visual. Add a second only when it answers a different part of the question.
3. Label every node, axis, and assumption. Separate facts from hypotheticals.
4. Keep the visual readable: short labels, left-to-right or top-to-bottom flow, no decorative junk.
5. Follow the visual with at most a few sentences of interpretation. Do not restate the whole diagram in prose.
6. If numbers are missing, show a clearly marked example or ask only for the values that change the chart.

## Guardrails

- Never invent data and present it as real. Mark estimates and scenarios.
- Do not include credentials, private paths, or unrelated personal details in visuals.
- Prefer mermaid or a canvas over a huge ASCII drawing.
- If image generation is used, keep the prompt specific to the requested visual and skip decorative extras.

## Example triggers

- `Visualize how this process works.`
- `Compare these options in a chart.`
- `Show what changes when I adjust these assumptions.`
---
