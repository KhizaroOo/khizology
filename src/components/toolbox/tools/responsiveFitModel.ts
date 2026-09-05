export type FitHealth = 'good' | 'caution' | 'poor';

export interface FitMeasurement {
  width: number;
  cardWidth: number;
  height: number;
  innerWidth: number;
  headingLines: number;
  bodyLines: number;
  lineMeasure: number;
  actionRows: number;
  actionCount: number;
  wrappedLabels: number;
  overflow: boolean;
}

export interface FitAssessment {
  health: FitHealth;
  reasons: string[];
  actions: string[];
}

/** Comfort thresholds describe this card experiment, never a universal breakpoint rule. */
export function assessFit(measurement: FitMeasurement, widestHeadingLines: number, actionLayout: 'wrap' | 'row' | 'stack'): FitAssessment {
  const reasons: string[] = [];
  const actions: string[] = [];
  if (measurement.overflow) {
    reasons.push('Content extends beyond its available width.');
    actions.push('Reduce the minimum card width or horizontal padding; allow actions to wrap or stack. Check unbroken words and labels.');
  }
  if (measurement.headingLines >= 4 || (widestHeadingLines > 0 && measurement.headingLines > widestHeadingLines * 2)) {
    reasons.push(`The heading uses ${measurement.headingLines} lines (${widestHeadingLines} at 1440 px).`);
    actions.push('Try a smaller heading size or less horizontal padding. Review the copy manually if the heading becomes hard to scan.');
  }
  if (measurement.wrappedLabels > 0) {
    reasons.push(`${measurement.wrappedLabels} action label${measurement.wrappedLabels === 1 ? '' : 's'} wrap onto multiple lines.`);
    actions.push('Try stacked actions, less button padding, or a shorter label.');
  }
  if (actionLayout !== 'stack' && measurement.actionRows > 1) {
    reasons.push(`Actions occupy ${measurement.actionRows} rows; they no longer share a row.`);
    actions.push('If one row matters, reduce the action gap or label length. Otherwise, choose an intentional stacked layout.');
  }
  if (measurement.lineMeasure > 80) {
    reasons.push(`The widest paragraph line spans about ${Math.round(measurement.lineMeasure)} ch.`);
    actions.push('Reduce the maximum card width or increase the body size to shorten reading lines.');
  }
  if (measurement.innerWidth < 220) {
    reasons.push(`Only ${Math.round(measurement.innerWidth)} px remain inside the card padding.`);
    actions.push('Reduce horizontal padding to give the content more room.');
  }
  if (measurement.bodyLines > 18) {
    reasons.push(`The paragraph occupies ${measurement.bodyLines} lines.`);
    actions.push('Review paragraph length, spacing, and content hierarchy for this width.');
  }
  return {
    health: measurement.overflow ? 'poor' : reasons.length ? 'caution' : 'good',
    reasons: reasons.length ? reasons : ['No overflow or configured comfort threshold was detected.'],
    actions: [...new Set(actions)],
  };
}
