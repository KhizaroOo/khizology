# Growth measurement

Use the existing opt-in GA4 integration. No tag, page view or custom event is sent before acceptance or on localhost/loopback previews. Initialization attaches listeners once. Advertising signals remain disabled. Collection/tag controls are public catalog metadata, never search text.

## Actual signals

| Event | Evidence |
| --- | --- |
| `tool_start` | First eligible tool interaction per page; existing use signal, not completion. |
| `result_generated` | Explicit non-empty API Payload Doctor diagnosis; not a successful contract assertion. Other calculators are not falsely counted on mount. |
| `tool_export` | Existing local export trigger, with format and tool family; not proof that a file was saved. |
| `result_shared` | Native result share resolves successfully; cancellation does not count. |
| `result_copied` | Result clipboard write succeeds; includes share fallback to clipboard. |
| `share_action` | Public page/link sharing; `action` distinguishes copy link and native share. |
| `related_tool_click` | Related tool link with public source/destination. |
| `try_next_click` | Curated Next / Smart Next action; does not also emit a related click. |
| `tool_complete` | Successful Contract Drift review after both JSON documents validate; not contract compliance or file-save proof. |
| `related_art_click` | Related artwork selection, with the current artwork as source. |
| `artwork_tag_click` | Selection of a catalog subject tag, not free-text search. |
| `contact_click` | Email, WhatsApp, contact-page CTA, or LinkedIn on portfolio/contact surfaces. Ordinary social browsing is not a conversion. |
| `module_discovery` | Navigation into a different public monster territory. Related links use their specific event instead. |

Existing artwork views, Infooo guide progression, favorites, scenarios, chain continuation and Contract Drift run events remain available. `related_content_click` becomes the tool/art-specific names; LV3 `tool_next_move` becomes `try_next_click`. Result actions previously under `share_action` now use the dedicated names. Treat release day as a reporting definition change, not sudden organic growth. No collection event is invented: the current artwork registry has no authored collections.

## GA4 Admin setup — owner review required

**Release privacy gate (2026-10-13):** `audit:ga-config` found Enhanced Measurement modules in the production Google tag configuration (forms, outbound clicks, page views, scroll, site search, downloads and video). User-provided-data capabilities and automatic collection were disabled. Turn off Enhanced Measurement in the web stream, then rerun the existing gate after propagation. Application allowlists cannot guarantee privacy or prevent automatic duplicate events while Google's independent collection remains enabled. No settings were changed.

**Phase 0 final owner decision (2026-10-18):** mark **contact_click** and **result_shared**. Current supplied Admin evidence shows only purchase marked and no corresponding stream data; Khizar will apply the two selected toggles and remove purchase if applicable. Future candidates result_generated, tool_export and infooo_guide_complete require useful actual production events first. Do not mark every click, default calculation or tool_start. An event name in code is not automatically a GA4 Key Event. The shared attribution repair now supplies only allowlisted public referral roots; canonical page_location and all consent/privacy restrictions remain. Record its release date separately from UX effects.

In Admin → Data display → Events, mark the selected received events as key events. Use Realtime to verify receipt after deployment; use DebugView only in an intentional test session. Check one event per action, declined consent, cancelled share, and successful copy/export. No GA4 Admin settings are changed by this implementation.

Register only useful event-scoped custom dimensions in Admin → Data display → Custom definitions: `source_slug`, `source_module`, `destination_slug`, `destination_module`, `tool_slug`, `tool_family`, `contact_type`, `action`, `export_type` and `tag`. They contain public metadata only. Dimensions are not retroactive.

**Owner policy, superseding the earlier exclusion recipe (Phase 0, 2026-10-18): keep Khizar’s production usage measured when he consents.** Do not define personal-IP exclusions, fingerprint him or activate an owner/internal-traffic exclusion filter. Existing GA4 account filters have not been read: confirm privately that none excludes his traffic. Localhost/loopback suppression remains an environment safeguard, not an owner-identity filter. Classify external/owner evidence only in aggregate and leave uncertain identity unknown. See [current baseline and blockers](SEARCH-MEASUREMENT-BASELINE.md#phase-0-product-clarity-reset).

## Weekly decision view

Compare consistent 28-day windows: Search Console organic clicks/impressions → GA4 landing-page engaged sessions → tool use/output/contact/share → related and cross-module discovery. Segment by module, tool/family and source/destination. Review engaged sessions with value events rather than event totals alone. With six active users, report absolute counts and avoid drawing strong conclusions from rates.

Page locations are canonical, without query/hash. After consent, events include only scheme/hostname roots for the explicit public referral-host allowlist in `analytics.ts`; other and same-site referrals are blank. Referrer paths, queries, fragments, credentials and non-default ports are excluded. Local browser checks can read the browser-provided referrer before an event is sent; the site does not persist referral addresses in browser storage. Consent still gates all analytics transmission. This restricted coverage limits referral/campaign attribution; do not restore arbitrary URLs or referrer strings for acquisition reporting. Use Search Console for organic acquisition evidence. Revenue is not a target unless a real commercial flow exists.

Sharing uses canonical page URLs; artwork fragments contain public slugs only. Safe result adapters remain curated summaries. Analytics never receives the summary, clipboard content, filename, payload, JWT, upload, form value or share URL.

Official setup references: [key events](https://support.google.com/analytics/answer/13128484), [internal traffic](https://support.google.com/analytics/answer/10104470), [custom dimensions](https://support.google.com/analytics/answer/14240153).

## Growth Engine v1 shortlist

`growthPriority` in the canonical tool registry identifies ten active tools. Selection reflects concrete problem/output, mature implementation, sharing potential and existing Value gates; it is not measured demand, a search-volume estimate or a fabricated numeric Value score.

| Tool | Useful output / reason |
| --- | --- |
| API Payload Doctor | Structural diagnosis and valid Contract Drift review; aggregate-only sharing. |
| Retry Storm Simulator | Compare retry amplification and backoff strategies with a safe model summary. |
| Rate Limit Playground | Compare throttling policies and their modeled traffic effects. |
| Circuit Breaker Playground | Trace failure isolation and recovery behavior. |
| Connection Pool Simulator | Explain pool contention, queue pressure and timeouts. |
| Queue Capacity Planner | Inspect backlog growth and drain capacity. |
| Fan-Out Latency Simulator | Explore critical-path and tail-latency trade-offs. |
| Timeout Chain Planner | Explain deadline headroom and wait-budget exposure. |
| Perspective Grid Maker | Export a practical drawing template; uploaded images stay on device. |
| Bleed & Safe Area Builder | Export a print guide and continue into layout/paper workflows. |

The existing toolbox hub surfaces three registry-selected starters. All ten retain static use cases, examples, limitations, canonical/social metadata and related paths. Eight already support safe LV3 result summaries; the two visual makers use local exports and canonical copy links. No uploaded image or private input becomes a share URL or stored workspace value.

The existing bounded My Toolooo workspace remains the return surface: recents, favorites and clear controls. Favorites are no longer repeated in Recent; the two priority makers can use the existing favorite control without a separate storage system. Related Art retains canonical subject/explicit relationships. No collection event is emitted while there are no authored collections.

Use `tool_complete` as an optional key event only if completed contract review is a useful outcome for the chosen report. Keep it separate from diagnostic success, compliance and commercial conversions. `copy_result` was superseded by `result_copied` before deployment; do not emit both names for one copy.
