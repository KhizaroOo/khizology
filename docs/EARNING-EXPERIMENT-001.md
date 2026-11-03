# Earning experiment 001 — Technical Clarity Review

Status: approved for local integration. Deployment and the experiment's launch date require separate owner confirmation.

## Approved offer

Bring one technical problem. Receive a 45–60 minute review and a concise written next-step action plan. Introductory experiment price: **$99 USD**. This is an experiment, not a permanent pricing decision or a promise to implement a fix.

Qualification precedes payment: send a short non-sensitive problem summary; Khizar checks fit; have a short discovery call only if useful; confirm scope and arrange the $99 payment manually; then technical analysis, a 45–60 minute solution session and the written action plan. There is no payment if the problem is not accepted. The discovery call is for understanding the problem, not the full solution. Only reviews where Khizar believes he can provide useful technical value are accepted.

Approved areas: software/system architecture, APIs/integrations, backend/.NET, databases, cloud/deployment, scalability/performance, microservices, AI integration architecture, blockchain application architecture and technical delivery decisions. Broad, out-of-experience or specialist problems are declined before payment. Never send credentials, production secrets, private keys or sensitive customer data.

The action plan covers Problem → Findings → Recommended Direction → Priority Actions → Risks → Next Step. The service provides clarity/direction, not implementation, unlimited debugging/support, ongoing consulting, full project delivery, guaranteed outcomes or work outside the agreed problem. Implementation can be discussed separately. The card uses a native, initially collapsed disclosure for this process and scope; the primary CTA is “Check if my problem fits”.

Primary validation target: at least **one paid $99 review within 30 days**. The 30-day window starts when Khizar confirms the offer is live; no launch date or sales have been recorded here.

## Placement and contact

The existing Toolooo hub and contact page show the same small shared offer. Four active tools opt in through `clarityReview` in the canonical tool registry:

- API Payload Doctor: applying a payload diagnosis to an actual API contract.
- Database Decision Lab: evaluating architecture tradeoffs for a real workload.
- Retry Storm Simulator: reviewing recovery pressure and retry policy.
- Timeout Chain Planner: reviewing deadlines, retries and downstream budgets.

Detail-page offers follow the tool workspace, next actions and model limitations. Other tools remain unchanged. Offer CTAs open canonical WhatsApp or email with an editable $99 Technical Clarity Review introduction. Tool-page messages include only the canonical registry name and clean public tool URL, generated at build time through the existing URL helper. Hub/contact-page messages are generic. No inputs, results, visitor query/hash or uploaded content enters the message. The visitor manually writes their problem before sending. General contact-page WhatsApp, LinkedIn and email links remain unchanged. Start with a non-sensitive outline, without credentials or private payloads.

There is no new public route, checkout, payment processing, booking service, account, form backend or dependency.

## Measurement and interpretation

Funnel: offer views → offer CTA clicks → qualified inquiries → paid reviews.

- `earning_offer_view`: at least half the offer is visible in a visible document; at most once per offer per page document, after analytics consent. No exposure is recorded before consent.
- `earning_offer_click`: each trusted offer CTA click after consent. Repeated clicks count as separate interactions, not unique people.
- Event fields: fixed `experiment_id`, public `surface` slug, and, for clicks, `contact_method` enum. Existing sanitized canonical page metadata also applies. No tool input, result, message, contact value, private URL state or exception is sent.
- An offer CTA can also emit the existing `contact_click` event: this intentionally describes contact navigation, while the earning event describes offer intent. Do not add those event totals together as conversions. General contact links do not emit earning events.
- Local previews suppress analytics. Mock tests prove code behavior, not live GA4 receipt or private GA4 configuration. No GA4 admin/key-event configuration is changed.

Owner interpretation: **10+ clicks** is an interest signal; **3+ qualified inquiries** is meaningful demand; **1+ paid customer** validates this experiment. These are decision heuristics, not statistical guarantees. Consent exclusions, repeated clicks and owner traffic limit interpretation.

Khizar manually assesses relevant inquiries and confirms actual payments. Do not infer them from clicks, invent totals, or put private conversations/customer records in repository notes. Review the experiment after the confirmed 30-day window before extending or changing it.
