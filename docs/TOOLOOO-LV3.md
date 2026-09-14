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
