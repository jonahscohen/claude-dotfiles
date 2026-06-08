import { typographyKnowledge } from './typography';
import { colorKnowledge } from './color';
import { layoutKnowledge } from './layout';
import { motionKnowledge } from './motion';
import { iconsKnowledge } from './icons';
import { craftKnowledge } from './craft';
import { antiSlopKnowledge } from './anti-slop';
import { premiumPatternsKnowledge } from './premium-patterns';
import { responsiveKnowledge } from './responsive';
import { dataVizKnowledge } from './data-viz';
import { interactionStatesKnowledge } from './interaction-states';
import { critiqueRubric } from './critique-rubric';
import type { AppMode } from '../../App';

export interface DesignKnowledgeModule {
  id: string;
  title: string;
  content: string;
  modes: AppMode[];
  priority: number;
}

const allModules: DesignKnowledgeModule[] = [
  typographyKnowledge,
  colorKnowledge,
  premiumPatternsKnowledge,
  layoutKnowledge,
  motionKnowledge,
  iconsKnowledge,
  craftKnowledge,
  antiSlopKnowledge,
  responsiveKnowledge,
  dataVizKnowledge,
  interactionStatesKnowledge,
  critiqueRubric,
];

export function getDesignKnowledge(mode: AppMode, tokenBudget = 4000): string {
  const applicable = allModules
    .filter(m => m.modes.includes(mode))
    .sort((a, b) => a.priority - b.priority);

  let total = 0;
  const selected: string[] = [];
  for (const mod of applicable) {
    const estimate = Math.ceil(mod.content.length / 4);
    if (total + estimate > tokenBudget) break;
    selected.push(`## ${mod.title}\n${mod.content}`);
    total += estimate;
  }

  return selected.length > 0
    ? `DESIGN KNOWLEDGE REFERENCE:\n\n${selected.join('\n\n')}`
    : '';
}
