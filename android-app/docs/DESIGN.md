# Margin design direction

Margin is a decision tool for highly involved university students. It should feel like a thoughtful weekly planner, not a wellness dashboard or a generic AI assistant.

## Design read

- Purpose: reveal the cost of a commitment before the student says yes.
- Audience: students balancing classes, clubs, jobs, competitions, and relationships.
- Tone: direct, warm, quietly confident.
- Energy: 2/5.
- Rhythm: 2/5, mostly steady with one dominant decision per screen.
- Motion: 1/5, reserved for navigation and state changes.

## Visual system

- Warm canvas (`#F8F7F2`) replaces sterile white; deep ink (`#17221E`) carries most content.
- Forest (`#0F6B4F`) is the action color. Coral (`#D45F4E`) is reserved for overload, amber for physical load, and violet for social load.
- IBM Plex Sans is bundled locally in regular, medium, semibold, and bold weights. Its technical-human character fits a planning tool while avoiding the generic geometric display face used by many generated dashboards.
- Headings rely on weight, line breaks, and whitespace rather than a decorative display font. Labels stay compact and literal.
- Corners use a restrained 4 / 10 / 18 dp scale. Lists and data regions use rules and whitespace before stacked cards.
- Capacity dimensions are identified with labels and position, never color alone.
- Interactive outlines use the stronger neutral (`#747C77`); pale rules remain decorative separators.

## Interaction rules

- Every visible control works in the prototype, including editing and removing confirmed commitments.
- Today, Plan, Check-in, and Recover form the persistent navigation. Focused task and success screens omit it.
- Onboarding separates the recurring baseline from named commitments: checklist → hours → conditional feel questions → import/manual choice.
- Physical and Social feel questions are skipped when the selected routine does not meaningfully load that dimension.
- Imported timetable corrections are explicit and undoable; optional free text can never silently replace structured answers.
- Hypothetical commitments remain outside the week unless “Add anyway” is chosen.
- Empty, loading, and recoverable error states live in the relevant workflow.
- All primary touch targets are at least 48 dp high and key status text has a non-color label.
- Tabs, choices, expandable rows, and live import states expose explicit accessibility semantics.
- Seeded sample values are labeled as a demo week so prototype data is never mistaken for synced student data.

## Anti-slop decisions

- One decision dominates each screen; explanatory copy is short and specific.
- No gradients, glass effects, oversized hero numerals, floating chat controls, or decorative analytics.
- Cards are used only for grouped choices, editable commitments, and stateful results—not as a wrapper for every paragraph.
- Vector marks and navigation glyphs are drawn from a small consistent stroke language.
- The dashboard answers “how full?”, “where is the pressure?”, and “what can I do?” in that order.

## Design source

- Figma file: [Beating the Burnout — Mobile MVP](https://www.figma.com/design/7V15JID1qfZYj4JVYHj7zO/Beating-the-Burnout-%E2%80%94-Mobile-MVP)
- Repository board: [`design/margin-mobile-mvp.svg`](design/margin-mobile-mvp.svg)
- Rendered Android states: [`screenshots/final/`](screenshots/final/)

The Android implementation is the interaction source of truth; [SCREEN_MAP.md](SCREEN_MAP.md) records parity between product requirements, design frames, and native screens.
