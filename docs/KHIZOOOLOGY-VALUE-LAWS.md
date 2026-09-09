# Khizooology Value Laws

Every idea is scored before it becomes a build. Score each law 0 (weak or missing), 1 (acceptable), or 2 (strong). The maximum is 36.

| Law | Question |
|---|---|
| Utility | Does it solve a real problem or make a real task easier? |
| Unity | Does it belong in the existing experience? |
| Depth | Does it explain more than a shallow answer? |
| Identity | Is it unmistakably Khizooology? |
| Discovery | Can the right person find it? |
| Visuality | Does it make something clearer to see? |
| Interaction | Does interaction reveal something useful? |
| Truth | Are claims, limits and sources honest? |
| Clarity | Can someone understand it quickly? |
| Actionability | Does it lead to a useful next move? |
| Shareability | Can a public result be shared safely? |
| Compound Value | Can it support future learning or content without forcing it? |
| Maintainability | Can it remain understandable and safe to change? |
| Measurability | Can its public usefulness be measured with consent? |
| Surprise | Does it reveal something worth noticing? |
| Original Contribution | Does it add a missing mental model or interaction? |
| Respect | Does it protect time, privacy, accessibility and attention? |
| Craft | Does it feel deliberate and finished? |

## Decisions

| Score | Decision |
|---|---|
| 0–17 | REJECT |
| 18–23 | REWORK |
| 24–29 | PROTOTYPE |
| 30–33 | STRONG |
| 34–36 | FLAGSHIP |

Utility, Identity, or Truth scored 0 is a hard gate: reject or rework regardless of the total.

## Research workflow

Think → Create ideas → Score → Prototype → Build → Verify → Publish → Share/Market → Measure → Improve → Build smarter.

For every proposed build: identify the existing problem, research existing solutions, name the missing mental model, invent a better interaction, then build the Khizooology version. The repository model is `src/data/valueLaws.ts`; it contains the reusable idea-evaluation schema and decision helper.
