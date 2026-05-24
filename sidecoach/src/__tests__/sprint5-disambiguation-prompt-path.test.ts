import { FlowExecutionEngine } from '../sidecoach-orchestrator';
import { DisambiguationResult, MatchResult, FlowId } from '../types';
import * as path from 'path';

(async () => {
  const refRoot = path.resolve(__dirname, '../../../reference');
  process.env.SIDECOACH_PROJECT_PATH = refRoot;
  const engine = new FlowExecutionEngine();
  const projectPath = path.resolve(__dirname, '../../');

  // Real-world fixture: a tokens-related utterance that could plausibly match
  // multiple flows. The orchestrator should NOT silently resolve the tie
  // because the synthetic tieBreak reason is an alphabetical fallback, not a
  // recommendation-field tiebreaker.
  const utterance = 'validate tokens against DESIGN.md';

  const candidateF: MatchResult = {
    flowId: 'flowF_design_tokens' as FlowId,
    flowName: 'Design System Tokens (DESIGN.md)',
    confidence: 0.7,
    matchedTokens: ['tokens', 'design.md'],
    reason: 'Rule-based match (confidence: 70%)',
  };
  const candidateJ: MatchResult = {
    flowId: 'flowJ_tactical_polish' as FlowId,
    flowName: 'Tactical Polish',
    confidence: 0.7,
    matchedTokens: ['polish'],
    reason: 'Rule-based match (confidence: 70%)',
  };

  const synthetic: DisambiguationResult = {
    candidates: [candidateF, candidateJ],
    isAmbiguous: true,
    clarificationNeeded: 'User must choose between candidate flows',
    tieBreak: {
      chosenFlowId: 'flowF_design_tokens',
      // Alphabetical fallback - NOT a recommendation-field tiebreak. This
      // forces the orchestrator to take the user-prompt branch.
      reason: 'Alphabetical fallback among 2 equal-confidence matches',
    },
  };

  const originalDetect = (engine as any).intentDetector.detect.bind((engine as any).intentDetector);
  (engine as any).intentDetector.detect = (u: string) => {
    if (u === utterance) {
      return synthetic;
    }
    return originalDetect(u);
  };

  const result: any = await engine.process(utterance, {
    projectPath,
    projectContext: { register: 'brand' },
  } as any);

  // Restore the patched detector so other tests are unaffected.
  (engine as any).intentDetector.detect = originalDetect;

  const checks: Array<[string, boolean]> = [
    ['needsDisambiguation is true', result.needsDisambiguation === true],
    ['success is false', result.success === false],
    ['detectedFlow is null', result.detectedFlow === null],
    ['flowResults is empty', Array.isArray(result.flowResults) && result.flowResults.length === 0],
    ['ambiguousCandidates has 2 entries', Array.isArray(result.ambiguousCandidates) && result.ambiguousCandidates.length === 2],
    ['ambiguousCandidates contains flowF_design_tokens', Array.isArray(result.ambiguousCandidates) && result.ambiguousCandidates.some((c: any) => c.flowId === 'flowF_design_tokens')],
    ['ambiguousCandidates contains flowJ_tactical_polish', Array.isArray(result.ambiguousCandidates) && result.ambiguousCandidates.some((c: any) => c.flowId === 'flowJ_tactical_polish')],
    ['disambiguationPrompt mentions the utterance', typeof result.disambiguationPrompt === 'string' && result.disambiguationPrompt.includes(utterance)],
    ['disambiguationPrompt mentions multiple flows', typeof result.disambiguationPrompt === 'string' && /multiple flows/i.test(result.disambiguationPrompt)],
  ];

  let allPass = true;
  for (const [label, ok] of checks) {
    console.log(ok ? `PASS ${label}` : `FAIL ${label}`);
    if (!ok) allPass = false;
  }

  console.log(allPass ? 'sprint5-disambiguation-prompt-path PASS' : 'sprint5-disambiguation-prompt-path FAIL');
  process.exit(allPass ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
