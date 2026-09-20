# Build Smarter With Data

Use real aggregate signals to decide what Khizooology should improve, promote, connect, maintain, explore, hold, or stop investing in next. Metrics are signals, not truth or a substitute for the Publishing Quality Checklist and Value Laws.

`PUBLISH → MEASURE → INTERPRET → CHOOSE → IMPROVE → MEASURE AGAIN`

## Principles

- Separate **observation**, **interpretation**, and **decision**. A metric identifies a symptom; a person investigates the cause.
- Do not use a magic score, automatic ranking, or universal traffic threshold.
- Treat low data as uncertainty. `HOLD` is usually the correct response to insufficient evidence.
- Keep Truth, Utility, and Identity as hard quality gates. Traffic never overrides them.
- A recommendation is advisory. It never deletes, unpublishes, noindexes, rewrites, publishes social content, or starts a feature automatically.

## Signals and review windows

Start with a recent 28-day period, compare it with the previous 28 days, and use 90 days for context when useful. These are review defaults, not universal truth; new and low-traffic work often needs more time.

Use only aggregate, consented evidence:

- **Search Console:** impressions, clicks, CTR, average position, queries, and landing pages.
- **GA4:** page views, sessions, engagement, source, return, and public navigation behavior.
- **Product analytics:** public metadata-only events such as Toolooo starts, exports, safe shares, Smart Next/chain moves; artwork opens; and Infooo world, entity, or guide progression.
- **Canonical metadata:** tool, artwork, Infooo, Notooo, content-manifest, and Compound Value relationships.

Do not treat a single metric as a conclusion. High impressions with low CTR may justify a truthful intent/snippet review. Low reach with strong use after arrival may justify promotion. Rising impressions are an opportunity to review, not an order to generate pages.

## Decision actions

| Action | Meaning |
| --- | --- |
| **IMPROVE** | Existing value is clear enough to justify focused experience or content work. |
| **PROMOTE** | The artifact works after arrival, but discovery is weak. |
| **CONNECT** | It is useful but does not naturally lead deeper into related work. |
| **MAINTAIN** | Healthy enough; there is no strong reason to spend more effort now. |
| **EXPLORE** | A signal suggests a small related experiment or creation candidate. |
| **HOLD** | Evidence is insufficient or too noisy for a useful decision. |
| **STOP INVESTING** | Repeated, sufficient evidence suggests pausing further effort. It never means delete or unpublish. |

Confidence is **low**, **medium**, or **high**, based on observation duration, volume, consistency, and relevance. Use **rising**, **stable**, **falling**, or **unknown** for trend. Keep a small planning shortlist: **now**, **next**, or **later**. These labels support human judgment; they are not a score.

## Reach/value guide

| Pattern | Review direction |
| --- | --- |
| High reach + high value | Improve selectively, connect useful next steps, or strengthen a Compound Value output. |
| Low reach + high value | Promote, improve truthful discovery, or connect related work. This may be a hidden gem. |
| High reach + low meaningful use | Investigate expectation, first screen, performance, CTA, interaction, and mobile experience. Do not assume the cause. |
| Low reach + low value | Hold first; consider stopping investment only after sufficient repeated evidence and review. |

## Module differences

### Toolooo

Review discovery, meaningful start/use, result or export behavior, safe shares, favorites, Smart Next, and chain continuation. A tool with low discovery but high use and continuation is a promotion candidate. Do not judge it by page views alone or send tool inputs, results, scenarios, payloads, uploads, or LocalStorage history to analytics.

### Artooo

Review gallery opens, related-artwork exploration, safe shares, search discovery, and returning exploration. These signals measure discovery and response, never artistic quality. Use creator-authored context only when it exists.

### Infooo

Review world entry, public entity/guide progression, safe sharing, and meaningful continuation. For Human Atlas, do not track search terms, anatomy selections as personal behavior, medical exploration, or profiles. Exploration is an educational signal, never a diagnosis signal.

### Future Notooo

The same structure can later review search discovery, reading engagement, related-tool/world clicks, shares, and return discovery. It does not create or publish Notooo records.

## Decision snapshot and log

Record one small **Decision snapshot** per reviewed source:

```text
SOURCE: canonical source type + ID
PERIOD: recent / comparison / context
OBSERVATION: aggregate signals only
TREND + CONFIDENCE: rising/stable/falling/unknown; low/medium/high
ACTION: improve/promote/connect/maintain/explore/hold/stop-investing
WHY: a human-readable interpretation
NEXT EXPERIMENT: one small reversible test, when useful
REVIEW: next measurement period
```

Then add an equally small decision-log entry that links back to the snapshot. This preserves why a decision was made so the next review can learn from it.

`src/data/buildSmarter.ts` contains **Synthetic examples** only: a low-reach/high-value Retry Storm promotion case, an Artooo maintenance case, a Human Atlas experience-gap investigation, and an insufficient-evidence HOLD case. They prove the workflow and must never be presented as production data.

## Compound Value and experiments

When a useful artifact has weak discovery, use the [Compound Value Workflow](COMPOUND-VALUE-WORKFLOW.md) to consider one truthful social draft, visual/demo idea, internal connection, or future Notooo candidate. Do not create every output automatically.

Prefer one small experiment: improve one internal link, prepare one social/demo pack, clarify a first screen, or test a focused companion note after approval. Measure again before expanding the work.

## Privacy and operating boundaries

Manual review is the current path. Export aggregate Search Console or GA4 data locally when helpful, inspect it, write a human-reviewed decision snapshot, and keep personal/raw exports out of Git. No API integration, OAuth, backend, database, dashboard, UTM architecture, runtime AI, or automated action is part of this workflow.

Never store or analyze raw Toolooo inputs, payload contents, JWTs, uploads, IP addresses, identifiable journeys, personal profiles, or sensitive Infooo exploration. Existing consent rules remain unchanged: GA4 loads only after acceptance, advertising features remain disabled, and events carry public metadata only.

Run the [Publishing Quality Checklist](PUBLISHING-QUALITY-CHECKLIST.md) before any decision leads to a public change.
