import type { Tool } from './tools';
import { getFamilyById } from './families';

export interface ToolKnowledge { whatIsThis?: string; whyDoesItMatter?: string; whatAmISeeing?: string; whatShouldIDo?: string; assumptions?: string; tryNext?: string; }

const familyGuidance = {
  check: ['A practical way to spot a risk before it becomes work.', 'Read the finding, then verify it in the system you control.', 'Try the related tool that checks the next part of the problem.'],
  simulate: ['A way to see how a system changes before changing the real one.', 'Move one input at a time and compare the visible change.', 'Try a preset, then test the edge case that worries you.'],
  decide: ['A way to make trade-offs visible instead of pretending there is one universal answer.', 'Adjust priorities until the result matches your real constraints.', 'Try a different priority to see what would change the recommendation.'],
  plan: ['A way to turn a loose intention into a visible plan.', 'Use the output as a starting layout, then check real measurements and constraints.', 'Try the related planner when the next decision has a different shape.'],
  create: ['A browser-side maker for a usable visual result.', 'Set the basics, inspect the preview, then export only when it looks right.', 'Try another format or tool when the next step needs a different output.'],
} as const;

export function getToolKnowledge(tool: Tool): ToolKnowledge {
  const guidance = familyGuidance[tool.family];
  return {
    whatIsThis: tool.longDescription,
    whyDoesItMatter: guidance[0],
    whatAmISeeing: `${tool.name} makes the important parts of this ${getFamilyById(tool.family)?.name.toLowerCase() ?? 'tool'} visible.`,
    whatShouldIDo: guidance[1],
    assumptions: 'This is a browser-side model and a starting point, not a replacement for checking your real context.',
    tryNext: guidance[2],
  };
}
