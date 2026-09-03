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

- The left rule and offset page gutter are the product's signature “margin.”
- Warm paper (`#F7F3EA`) replaces sterile white; deep ink (`#1C2723`) carries most content.
- Pine (`#315C50`) is the action color. Burnt orange (`#A63F21`) appears only for overload and consequential warnings; a lighter coral (`#FFA182`) preserves the warning meaning on ink surfaces.
- Serif display headings create an editorial identity; sans-serif body text keeps forms and numbers legible.
- Corners use a restrained 4 / 10 / 18 dp scale. Lists and data regions use rules and whitespace before cards.
- Capacity dimensions are identified with labels and position, never color alone.
- Interactive outlines use the stronger neutral (`#747C77`); pale rules remain decorative separators.

## Interaction rules

- Every visible control works in the prototype, including editing and removing confirmed commitments.
- Home, Add, See, and 5D are the only persistent tabs.
- Hypothetical commitments remain outside the week unless “Add anyway” is chosen.
- Empty, loading, and recoverable error states live in the relevant workflow.
- All primary touch targets are at least 48 dp high and key status text has a non-color label.
- Tabs, choices, expandable rows, and live import states expose explicit accessibility semantics.
- Seeded sample values are labeled as a demo week so prototype data is never mistaken for synced student data.
