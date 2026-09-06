import type { Family, FamilyId } from './families';
import type { Tool } from './tools';

export interface ToolSeoContent {
  title: string;
  description: string;
  primaryProblem: string;
  relatedPhrases: string[];
  whatYouLearn: string;
  whenToUse: string;
  interpretation: string;
  limitations: string;
}

const familyInterpretation: Record<FamilyId, string> = {
  check: 'Read each finding as a diagnostic signal, then confirm it against the contract, system, file, or production context you actually control.',
  simulate: 'Compare the shape and direction of different scenarios. The useful signal is how the result changes when an input changes, rather than one isolated number.',
  decide: 'Treat the leading option as the best fit for the priorities you selected. Review the score breakdown before acting because changing those priorities can change the result.',
  plan: 'Use the calculated fit, spacing, timing, or risk as a planning baseline, then verify it against the physical, commercial, or technical constraints of the real project.',
  create: 'Inspect the preview and generated asset against your source material and intended output before using it in production or sending it to print.',
};

const familyLimitations: Record<FamilyId, string> = {
  check: 'This browser-only check cannot observe your server, runtime, deployment, or external contract. It highlights issues in the information you provide and does not replace system-specific validation.',
  simulate: 'This is a simplified explanatory model, not a load test or production forecast. Real systems can include dependencies, distributions, failures, and feedback loops outside the selected inputs.',
  decide: 'The comparison uses transparent editorial scores and the priorities you choose. It supports a decision; it does not prove that one technology or approach is objectively best.',
  plan: 'Results are estimates based on the entered assumptions. Supplier specifications, team constraints, tolerances, and real-world conditions may require a different final plan.',
  create: 'The output is generated locally from your inputs. Check dimensions, compatibility, color, and production requirements in the destination workflow before relying on the exported asset.',
};

const toolLimitations: Partial<Record<string, string>> = {
  'api-payload-doctor': 'The diagnosis uses structural and consistency checks on the pasted JSON. It does not call the API, execute a schema, test authorization, or prove how a server will process the payload.',
  'jwt-time-machine': 'JWT Time Machine decodes time-related claims for inspection. It does not verify the token signature, issuer authenticity, revocation state, permissions, or server-side acceptance.',
  'cors-doctor': 'The result follows the request and response details you enter. It does not send a network request, inspect the live server, change headers, or bypass the browser’s CORS enforcement.',
  'print-ready-doctor': 'Print quality is estimated from pixel dimensions, crop, and target size. Printer hardware, media, viewing distance, sharpening, and production tolerances can change the final result.',
  'schema-drift-doctor': 'The comparison describes the supplied samples. A sample may not represent every valid record or the full formal data contract, so confirm important findings against the authoritative schema.',
  'environment-drift-detector': 'The comparison focuses on key presence, empty values, and apparent types while masking values. It cannot determine whether a secret is correct or whether a configuration works at runtime.',
  'responsive-content-fit-lab': 'The preview measures a configurable content card and labels readability with explicit heuristics. It is not a substitute for testing the complete product in real browsers with real content.',
  'webhook-delivery-simulator': 'This deterministic model explains retries, acknowledgements, recovery, and idempotency. It does not deliver webhooks or reproduce every queue, timeout, and receiver behavior in a production system.',
  'capacity-cliff-simulator': 'Demand and capacity follow the growth, peak, loss, threshold, and expansion assumptions you enter. Use the crossings as planning signals, not guaranteed forecasts.',
  'retry-storm-simulator': 'The traffic model simplifies failure and retry behavior. It is designed to compare immediate retry, backoff, and jitter patterns; it is not a production load test.',
  'ai-project-pricing-lab': 'The range depends on your effort, rate, review, revision, support, and uncertainty inputs. It does not know the client relationship, market, contract, taxes, or final commercial risk.',
  'multi-format-campaign-planner': 'The layout plan uses the selected formats, safe areas, and focal-zone assumptions. Platform templates and publishing interfaces can change, so verify the final creative in each destination.',
};

function sentenceList(values: string[]): string {
  if (values.length <= 1) return values[0] || '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

function titleCaseIntent(value: string): string {
  const acronyms = new Map([
    ['ai', 'AI'], ['api', 'API'], ['cors', 'CORS'], ['csv', 'CSV'], ['http', 'HTTP'],
    ['json', 'JSON'], ['jwt', 'JWT'], ['orm', 'ORM'], ['ppi', 'PPI'], ['sla', 'SLA'],
    ['sql', 'SQL'], ['svg', 'SVG'], ['ttl', 'TTL'], ['url', 'URL'],
  ]);
  return value.split(' ').map((word) => acronyms.get(word.toLowerCase())
    || `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(' ');
}

export function getToolSeo(tool: Tool, family: Family): ToolSeoContent {
  const primaryProblem = tool.keywords[0] || tool.name;
  const relatedPhrases = tool.keywords.slice(1, 4);
  const contexts = tool.tags.slice(0, 3).map((tag) => tag.toLowerCase());
  const searchLanguage = [primaryProblem, ...relatedPhrases.slice(0, 2)];

  return {
    title: `${tool.name} — ${titleCaseIntent(primaryProblem)} | Toolooo · Khizooology`,
    description: tool.shortDescription,
    primaryProblem,
    relatedPhrases,
    whatYouLearn: tool.longDescription,
    whenToUse: `Use ${tool.name} when ${sentenceList(contexts)} work raises questions about ${sentenceList(searchLanguage)} and you need a concrete view before making the next move.`,
    interpretation: familyInterpretation[family.id],
    limitations: toolLimitations[tool.slug] || familyLimitations[family.id],
  };
}
