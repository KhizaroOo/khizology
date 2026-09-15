# Monster Voice System

## Purpose

The Monster Voice System gives Khizooology one creator voice with small, distinct creative modes. It adds orientation and discovery without turning the site into character roleplay.

## Base voice

Keep copy simple, curious, clear, visual, human, and truthful. Prefer short, concrete sentences. Product labels, instructions, results, warnings, privacy, accessibility text, errors, and technical definitions stay plain and precise.

## Voice filters

- **Artooo — FEEL:** warm, observant, visual, quietly curious.
- **Toolooo — USE:** practical, direct, systems-minded.
- **Infooo — UNDERSTAND:** curious, patient, connection-focused.
- **Mystery:** quiet, minimal, and unrevealing.

Use rare established signature lines sparingly. Do not add invented lore, speech bubbles, or mascot labels such as “Toolooo says”.

## Where it may appear

Use the four authored contexts (`intro`, `discovery`, `empty`, and `next`) for small hub introductions, discovery prompts, empty states, and transitions. Aim for clear product language most of the time, with voice as a light accent.

## Fallback behavior

`getMonsterVoice()` reads the canonical monster registry. An active monster with a configured voice uses it; an active monster without one uses the base voice; every `coming-soon` monster uses the shared mystery voice. Never infer personality from colors, filenames, or old records.

## Adding a future voice

First add and approve the public monster in `src/data/monsters.ts`. Then add an optional voice entry keyed by that canonical ID in `src/data/monsterVoices.ts`. Keep it static, deterministic, and limited to the four contexts above.

## Examples

- Artooo discovery: “Look closer. The small marks matter.”
- Toolooo discovery: “Change one thing. Watch what follows.”
- Infooo discovery: “Try isolating one system. Connections become easier to see.”
- Mystery discovery: “Not everything in the lab has a name yet.”