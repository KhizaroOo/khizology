# Toolooo LV3

Toolooo levels describe product depth: LV1 answers a question, LV2 makes the answer understandable, and LV3 connects a proven tool to the next useful action.

## Foundation

The canonical `Tool` registry can opt into LV3 with an optional `lv3` object. It declares capabilities, curated next moves, and relevant chain IDs. Tool components keep their inputs, calculations, scenarios, and result meaning local.

- **Scenario Mode:** `ToolScenarioSwitcher` manages selectable named input patches and reset UI. A tool supplies the scenarios and applies them to its own state.
- **Share Results:** `ShareResultFoundation` shares a canonical URL and an explicit, tool-provided text summary. It never inspects arbitrary state or serializes it into a URL.
- **My Toolooo:** favorites, recent tools, and chain progress live in bounded `localStorage` metadata under one browser-only key. There is no signup, server, or cloud sync.
- **Smart Next Moves:** the tool registry provides up to three curated, deterministic moves. They extend the existing related-tools idea instead of replacing it.
- **Tool Chains:** `src/data/toolChains.ts` defines short, purposeful sequences using canonical tool IDs. v1 handoff is navigation only; it never transfers inputs.

## Privacy and analytics

No tool inputs, result payloads, pasted text, files, tokens, or URLs with private state are stored or sent. Consent-gated analytics record only safe IDs for favorite, scenario, next-move, and chain interactions.

## Upgrade a tool

1. Start with a strong LV2 tool and identify a real connection.
2. Add only the relevant optional LV3 capabilities to its registry record.
3. Add local scenario/share logic only when its inputs and result are safe and meaningful.
4. Add curated next moves or a validated chain when the order has a clear purpose.
5. Test the tool and LV3 audits, then set `featureLevel: 3` only when the connected experience is complete.

## Retry Storm Simulator and Rate Limit Playground assumptions

These two browser-only educational models are deliberately bounded to 24 seconds. Retry Storm models retryable transient failures only when selected; non-retryable errors create no automatic retry traffic. Attempt limits, a retry budget, backoff strategy, jitter, and simulated capacity are explicit inputs. Idempotency is always chosen by the person using the tool and is never inferred.

Rate Limit Playground models fixed-window, simplified sliding-window, and token-bucket behavior under selected traffic patterns. A throttled request is shown as `429 Too Many Requests` only in the HTTP teaching mode. `Retry-After` is optional and affects the model only when enabled; neither a queue nor a Retry-After header is implied by a generic rate limiter.

The models draw their cautious framing from AWS retry guidance and Google Cloud retry guidance: use bounded attempts, backoff, and jitter where retrying is safe and appropriate, and avoid retrying non-idempotent or unretryable operations. MDN documents that 429 may include Retry-After, rather than requiring it. See the official sources: https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html, https://docs.cloud.google.com/storage/docs/retry-strategy, and https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429.
## Circuit Breaker Playground assumptions

Circuit Breaker Playground is a bounded 60-request educational state machine. It uses Closed, Open, and Half-Open states with a consecutive-failure threshold, an open wait measured in request opportunities, and a configurable number of healthy probes. It visualizes a deterministic selected failure pattern; it does not reproduce a particular library's rolling-window, timeout, fallback, or concurrency semantics.

The breaker and retry tools teach complementary controls: retries may make another attempt when an error is safe and transient, while an open breaker rejects calls likely to fail. Rate limiting controls incoming demand; it is not interchangeable with a circuit breaker. The retry control is conceptual only and never transfers data. Fallback is intentionally not modeled because a truthful fallback depends on application-specific behavior.

Microsoft's Circuit Breaker pattern documents the Closed → Open → Half-Open lifecycle and limited recovery probes. AWS describes circuit breakers as a way to stop repeated calls during timeouts or failure and to detect recovery. See https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker and https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/circuit-breaker.html.

## Connection Pool Simulator assumptions

Connection Pool Simulator is a bounded, browser-only educational capacity model. It treats a pool as shared interchangeable capacity over 20 one-second ticks. Busy means a simulated request is executing with a borrowed connection; waiting means a caller has not acquired one yet; a **pool acquisition timeout** means that wait exceeded the chosen pool timeout. None of those labels diagnose a real database, SQL query timeout, network timeout, or connection leak.

The database budget visual calculates **potential** application connections as `instances × max pool size`, then compares that with the selected database maximum minus selected headroom. It is not a claim that every connection is open simultaneously. A larger pool can reduce modeled waiting while raising potential database exposure; the model does not simulate database CPU, locks, query plans, or a universal ideal pool size.

Microsoft documents that a pooled connection is returned for reuse when it is closed or disposed, and that requests can queue when a pool has reached its maximum and no usable connection is available. PostgreSQL documents `max_connections` as a limit on concurrent server connections and notes that resource allocation is sized directly from it. HikariCP documents `maximumPoolSize` as the maximum of idle and in-use connections, with callers waiting for an available one until `connectionTimeout`. These are provider-specific behaviors, not defaults used by this provider-neutral model. See https://learn.microsoft.com/en-us/sql/connect/ado-net/sql-server-connection-pooling?view=sql-server-ver17, https://www.postgresql.org/docs/17/runtime-config-connection.html, and https://github.com/brettwooldridge/HikariCP/wiki/Configuration.

## N+1 Query Visualizer assumptions

N+1 Query Visualizer is a browser-only educational model. Its per-item strategy uses `1 + parent rows`: one parent query and one related-data query for each parent. Its batched and simplified split-query strategies use two **simulated** commands, while the exact command count, SQL shape, and round trips of any real ORM or framework can vary. The latency estimate assumes sequential commands, so it is not measured request latency or a performance forecast.

The JOIN illustration estimates `parents × related rows per parent` as a simplified returned-row shape. It is not transferred bytes, and it does not model multiple sibling collection joins. The potential query execution rate is `queries per request × application requests per second`; it does not mean one connection per query or simultaneous database connections. No source code, SQL log, database, credential, or connection string is read or requested.

Microsoft documents that lazy loading can trigger an additional query per related entity access and create an N+1 pattern, while noting that eager or explicit loading can make data-access behavior clearer. Its single-versus-split query guidance explains that JOINs can cause cartesian or data duplication effects and that split queries introduce additional round trips with their own trade-offs. See https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying and https://learn.microsoft.com/en-us/ef/core/querying/single-split-queries.

## Queue Capacity Planner assumptions

Queue Capacity Planner is a bounded, browser-only FIFO-like capacity model. It calculates effective processing capacity as consumers × rate per consumer and makes a temporary burst distinct from sustained arrival above capacity. Queue depth is a buffer and not a direct wait-time prediction. The downstream safe rate is a user-provided scenario assumption, not a guarantee about a database, API, or broker.

Microsoft's Queue-Based Load Leveling and Competing Consumers patterns describe queues as a way to smooth work and distribute processing, while requiring capacity and downstream dependencies to be considered. A queue does not create sustained processing capacity. See https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling and https://learn.microsoft.com/en-us/azure/architecture/patterns/competing-consumers.

## Fan-Out Latency Simulator — Tail Latency Lab

### Purpose and model boundary

The Fan-Out Latency Simulator is a deterministic educational model of one request calling several downstream dependencies. In parallel mode, the caller response waits for the latest **required** branch to finish; in serial mode, branch work is accumulated. A branch marked optional is excluded from this response contract only when the caller can safely return a partial response. It can still consume resources, become stale, or need its own error handling.

The model intentionally separates a response **deadline miss** from a dependency **failure**. A client can stop waiting while a server has completed or continues work, so a deadline outcome is not evidence that the downstream dependency failed.

### Tail-risk calculation

For a per-required-branch slow-tail probability `f` and `n` required branches, the displayed amplification estimate is `1 - (1 - f)^n`. This formula assumes independent branch slow events. Shared networks, hosts, queues, deployment events, and upstream dependencies can correlate latency, so this number is an explanatory estimate rather than a production forecast. The P50/P95/P99 figures are calculated from 200 deterministic re-draws of the lab inputs; they are not production telemetry, and individual-service P99 values do not yield an exact end-to-end P99.

### Scenario assumptions

- **Small/large fan-out:** compare the critical-path effect as required branch count changes.
- **One slow dependency:** forces one required branch to 600ms so its critical-path impact is unambiguous.
- **Tail spike:** widens the modelled latency spread and increases the independent slow-tail input.
- **Tight deadline:** makes available response headroom visible without calling a late branch failed.
- **Optional dependency:** uses the same 600ms branch but assumes the response contract permits a partial response.

### Primary references

- Google SRE and gRPC guidance: [gRPC deadlines](https://grpc.io/docs/guides/deadlines/) explains deliberate client deadlines, elapsed-time propagation, and cancellation.
- Google SRE: [gRPC and deadlines](https://grpc.io/blog/deadlines/) discusses end-to-end latency, serial versus parallel RPCs, and the distinction between client and server outcomes.
- AWS Well-Architected: [Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html) covers timeout, retry, backoff, and jitter practices.

## Timeout Chain Planner — Deadline Budget Lab

### Purpose and model boundary

This is a serial, deterministic planning model: it shows one end-to-end deadline being consumed by elapsed local work and downstream expected latency. It keeps three different quantities separate: expected latency, each operation's per-attempt timeout ceiling, and the combined maximum configured wait exposure from attempts and backoff. A timeout is a duration limit for an operation; a deadline is the finish point for the larger request. An SLA/SLO is a service target, not a timeout value.

With **Propagate remaining deadline** on, each child call receives an effective wait cap no larger than the caller's remaining modeled budget. This is a modelled propagation policy, not a claim about every protocol or framework. gRPC, for example, supports deadline propagation in some implementations and deducts elapsed time when turning an absolute deadline into an outgoing timeout; other stacks can need explicit application behavior.

### Calculations and limits

- Expected serial work: local work plus the entered expected latency for each hop. It determines modeled deadline headroom or a deadline miss; it is not a predicted production percentile.
- Configured wait exposure: local work plus every hop's `(per-attempt timeout × attempts) + retry backoff`. It is a maximum configuration exposure, not expected latency.
- Timeout inversion: a configured child timeout exceeds the caller's remaining modeled deadline at that point. The tool flags it without claiming downstream work certainly stops or fails.
- Retry fit: attempts and entered backoff must fit the remaining end-to-end budget. A retry never restores the original deadline, and deadline fit alone does not make a retry appropriate or idempotent.
- Cancellation: **Yes** models a cancellation signal being propagated, but still states that handlers and application-spawned work must honor it. **No** and **Unknown** expose potential continued work after the caller gives up.

Parallel critical-path latency intentionally remains in Fan-Out Latency Simulator. This planner uses a serial chain so it can make the shrinking deadline waterfall unambiguous.

### Primary references

- [gRPC deadlines](https://grpc.io/docs/guides/deadlines/) distinguishes deadlines from timeouts, explains elapsed-time deduction during propagation, and notes language-specific propagation behavior.
- [gRPC cancellation](https://grpc.io/docs/guides/cancellation/) explains why a cancellation signal does not by itself interrupt application-provided work.
- [AWS retry guidance](https://docs.aws.amazon.com/wellarchitected/2022-03-31/framework/rel_mitigate_interaction_failure_limit_retries.html) recommends controlling retry count, backoff, and jitter, and choosing timeouts for the use case.

## SLA Chain Visualizer — Reliability Budget Lab

### Purpose and model boundary

The Reliability Budget Lab models a **required** serial user path. It multiplies entered availability assumptions only for required dependencies under a simplified independence assumption. The result is labelled **modeled end-to-end availability**, not an SLA or customer guarantee. Optional dependencies are excluded only when the product can accept a degraded response; their loss can still have functional or user-experience impact.

An SLI is what the team measures, an SLO is its selected objective, and an SLA is a formal commitment with terms, definitions, and consequences. Availability and latency are also separate dimensions: a successful-request availability objective is not a latency percentile, and a timeout is an operational limit rather than a service objective.

### Reliability and error-budget calculation

- Modelled availability: product of required dependency availability fractions.
- Objective gap or headroom: modelled availability minus the selected objective, reported in percentage points.
- Error budget: `100% − objective` converted to unavailable time only for the chosen 24-hour, 7-day, 30-day, or 365-day window. This is an availability-budget illustration, not incident accounting or permission for downtime.
- Largest reliability contributor: the lowest-availability required input. It is a model contributor, never a production root-cause diagnosis.
- Current versus degraded-response comparison: removes that contributor only as an explicit hypothetical product-contract assumption.

Shared regions, networks, databases, identity providers, deployments, and control planes can correlate failure. The lab does not invent a correlation coefficient or simulate redundancy with unsupported independence claims; it displays a qualitative shared-failure-risk warning instead.

### Primary references

- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/) describes success-ratio SLIs, error budgets, critical dependencies, and the difference between SLOs and business SLAs.
- [Google Cloud SLO monitoring concepts](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring) explains that error budgets are tied to SLO compliance periods and may be measured in requests or time.
- [Microsoft Learn: How to read an SLA](https://learn.microsoft.com/en-us/azure/reliability/concept-service-level-agreements) explains why provider SLAs have definitions and exclusions and should inform, rather than become, a workload SLO.
