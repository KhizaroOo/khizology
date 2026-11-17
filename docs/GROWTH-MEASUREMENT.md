# Growth measurement

Use the existing opt-in GA4 integration. No tag, page view or custom event is sent before acceptance or during local development and loopback previews. Initialization attaches listeners once. Advertising signals remain disabled. Collection/tag controls are public catalog metadata, never search text.

## Actual signals

| Event | Evidence |
| --- | --- |
| `tool_start` | First eligible tool interaction per page; existing use signal, not completion. |
| `result_generated` | Explicit successful generation or analysis in instrumented tools; an API diagnosis does not establish contract compliance. Other calculators are not falsely counted on mount. |
| `tool_export` | Existing local export trigger, with format and tool family; not proof that a file was saved. |
| `result_copied` | Result clipboard write succeeds; includes share fallback to clipboard. |
| `share_action` | Link copied or native share options opened. The action distinguishes page and result share options. Opening options does not establish delivery. |
| `related_tool_click` | Related tool link with public source/destination. |
| `try_next_click` | Curated Next / Smart Next action; does not also emit a related click. |
| `contract_drift_run` | An explicit Contract Drift comparison produced a valid result. Result counts stay in the browser. |
| `infooo_world_start` / `infooo_guide_complete` | First emitted interaction per world or completed guide per world and guide, each scoped to the page load. |
| `related_art_click` | Related artwork selection, with the current artwork as source. |
| `artwork_tag_click` | Selection of a catalog subject tag, not free-text search. |
| `contact_click` | Email, WhatsApp, contact-page CTA, or LinkedIn on portfolio/contact surfaces. Ordinary social browsing is not a conversion. |
| `module_discovery` | Navigation into a different public monster territory. Related links use their specific event instead. |

Existing artwork views, Infooo guide progression, favorites, scenarios, chain continuation and Contract Drift run events remain available. `related_content_click` becomes the tool/art-specific names; LV3 `tool_next_move` becomes `try_next_click`. MVP #6 retires the legacy `result_shared` and Contract Drift `tool_complete` emissions. Record the reporting definition change at release. No collection event is invented: the current artwork registry has no authored collections.

## GA4 Admin setup — owner review required

**Release privacy gate (2026-10-13):** `audit:ga-config` found Enhanced Measurement modules in the production Google tag configuration (forms, outbound clicks, page views, scroll, site search, downloads and video). User-provided-data capabilities and automatic collection were disabled. Turn off Enhanced Measurement in the web stream, then rerun the existing gate after propagation. Application allowlists cannot guarantee privacy or prevent automatic duplicate events while Google's independent collection remains enabled. No settings were changed.

**MVP #6 reporting policy:** Visits, starts, generated results, art opens, sharing, exports and discovery are engagement. Genuine tool and guide completions are product value. Offer and contact clicks are commercial intent. Confirmed leads, bookings and revenue require separate evidence. The site does not emit `generate_lead`. The Phase 0 key-event selection was historical. Current GA4 Admin settings and event receipt require separate verification. No settings were changed.

Register only useful event-scoped custom dimensions in Admin → Data display → Custom definitions: `source_slug`, `source_module`, `destination_slug`, `destination_module`, `tool_slug`, `tool_family`, `contact_type`, `action`, `export_type` and `tag`. They contain public metadata only. Dimensions are not retroactive.

**Owner policy, superseding the earlier exclusion recipe (Phase 0, 2026-10-18): keep Khizar’s production usage measured when he consents.** Do not define personal-IP exclusions, fingerprint him or activate an owner/internal-traffic exclusion filter. Existing GA4 account filters have not been read: confirm privately that none excludes his traffic. Localhost/loopback suppression remains an environment safeguard, not an owner-identity filter. Classify external/owner evidence only in aggregate and leave uncertain identity unknown. See [current baseline and blockers](SEARCH-MEASUREMENT-BASELINE.md#phase-0-product-clarity-reset).

## Weekly decision view

Compare consistent 28-day windows: Search Console organic clicks/impressions → GA4 landing-page engaged sessions → tool use/output/contact/share → related and cross-module discovery. Segment by module, tool/family and source/destination. Review engaged sessions with value events rather than event totals alone. With six active users, report absolute counts and avoid drawing strong conclusions from rates.

Page locations are canonical, without query/hash. After consent, events include only scheme/hostname roots for the explicit public referral-host allowlist in `analytics.ts`; other and same-site referrals are blank. Referrer paths, queries, fragments, credentials and non-default ports are excluded. Local browser checks can read the browser-provided referrer before an event is sent; the site does not persist referral addresses in browser storage. Consent still gates all analytics transmission. After consent, initialization may also pass one complete, validated source/medium/campaign tuple. Other campaign parameters and the full landing query stay out of application commands. Use Search Console for organic acquisition evidence. Revenue is not a target unless a real commercial flow exists.

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

Keep tool and guide completions separate from diagnostic success, compliance and commercial conversions.
