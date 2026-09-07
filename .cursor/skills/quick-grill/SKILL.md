---
name: quick-grill
description: Pause and run a short alignment interview before acting. Use only when the user says grill me, asks you to question them before taking action, or says they want the task fully understood first. Do not invoke automatically for clear requests.
---

# Quick Grill

Pause before acting. Review the full request and available context. Identify only the decisions, assumptions, or missing details that could materially change the result.

## When to invoke

Only when the user explicitly says `grill me`, asks you to question them before acting, or says they want the task fully understood first. Do **not** auto-invoke on clear requests.

## Interview

- Ask **no more than five** high-impact questions in one numbered batch.
- Do not ask for information already supplied or that can be safely discovered from files or other read-only context.
- Use short multiple-choice options when they make a decision easier. Always allow a free-text answer or `use your best judgment`.
- Skip minor preferences, distant edge cases, and questions that would not change the work.

After the user answers, ask **at most one** follow-up, and only if the missing answer would prevent correct completion. If a minor detail is still unknown, choose a reasonable default and state the assumption.

## Confirmation

Summarize the shared understanding:

- The goal
- The deliverable
- The important decisions
- The main constraints
- What finished looks like

End with: `Is this right? If so, I'll get started.`

## Hard stop

Do not create files, edit anything, call action-taking tools, send messages, publish, purchase, or begin the requested work until the user confirms the summary.

If they correct it, update only the affected parts and confirm again. Once approved, stop interviewing and complete the task.
---
