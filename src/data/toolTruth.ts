import type { Tool } from './tools';
import type { ToolSeoContent } from './toolSeo';

export interface ToolTruth { howItWorks?: string; assumptions?: string; limitations?: string; formulaOrLogic?: string; sources?: Array<{ label: string; url: string }>; lastReviewed?: string; educationalContext?: string; }

export function getToolTruth(tool: Tool, seo: ToolSeoContent): ToolTruth {
  return {
    howItWorks: tool.longDescription,
    assumptions: 'The tool runs in your browser and models the information you provide. It does not know facts outside that model.',
    limitations: seo.limitations,
  };
}
