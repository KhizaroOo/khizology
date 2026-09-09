export const valueLaws = [
  'utility', 'unity', 'depth', 'identity', 'discovery', 'visuality', 'interaction', 'truth', 'clarity',
  'actionability', 'shareability', 'compoundValue', 'maintainability', 'measurability', 'surprise',
  'originalContribution', 'respect', 'craft',
] as const;

export type ValueLaw = typeof valueLaws[number];
export type ValueLawScore = 0 | 1 | 2;
export type ValueLawScores = Record<ValueLaw, ValueLawScore>;
export type ValueDecision = 'REJECT' | 'REWORK' | 'PROTOTYPE' | 'STRONG' | 'FLAGSHIP';

export interface IdeaEvaluation {
  name: string;
  monster: 'artooo' | 'toolooo' | 'infooo' | 'notooo';
  problem: string;
  audience: string;
  existingSolution: string;
  missingMentalModel: string;
  khizooologyContribution: string;
  valueLawScores: ValueLawScores;
  totalScore: number;
  decision: ValueDecision;
  notes: string;
}

export interface ValueEvaluation { totalScore: number; decision: ValueDecision; hardGateFailed: boolean; }

export function evaluateValueLaws(scores: ValueLawScores): ValueEvaluation {
  const totalScore = valueLaws.reduce((total, law) => total + scores[law], 0);
  const hardGateFailed = scores.utility === 0 || scores.identity === 0 || scores.truth === 0;
  if (hardGateFailed || totalScore <= 17) return { totalScore, decision: 'REJECT', hardGateFailed };
  if (totalScore <= 23) return { totalScore, decision: 'REWORK', hardGateFailed };
  if (totalScore <= 29) return { totalScore, decision: 'PROTOTYPE', hardGateFailed };
  if (totalScore <= 33) return { totalScore, decision: 'STRONG', hardGateFailed };
  return { totalScore, decision: 'FLAGSHIP', hardGateFailed };
}

export function createIdeaEvaluation(input: Omit<IdeaEvaluation, 'totalScore' | 'decision'>): IdeaEvaluation {
  return { ...input, ...evaluateValueLaws(input.valueLawScores) };
}
