export type ToolFeatureLevel = 1 | 2 | 3;

export interface ToolFeatureLevelDefinition {
  level: ToolFeatureLevel;
  name: string;
  shortDescription: string;
  principle: string;
}

export const toolFeatureLevels: ToolFeatureLevelDefinition[] = [
  {
    level: 1,
    name: 'Basic',
    shortDescription: 'Input → Calculate → Result',
    principle: 'Answer it.',
  },
  {
    level: 2,
    name: 'Toolooo Standard',
    shortDescription: 'Explore → See → Understand → Act',
    principle: 'Understand it.',
  },
  {
    level: 3,
    name: 'Ecosystem',
    shortDescription: 'Connected workflows and deeper Toolooo experiences',
    principle: 'Connect it.',
  },
];

export const getToolFeatureLevel = (level: ToolFeatureLevel): ToolFeatureLevelDefinition =>
  toolFeatureLevels.find((definition) => definition.level === level)!;
