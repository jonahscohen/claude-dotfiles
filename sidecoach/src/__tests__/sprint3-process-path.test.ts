import { FlowExecutionEngine } from '../sidecoach-orchestrator';
import * as path from 'path';

function assertTrue(cond: any, label: string): void {
  if (!cond) {
    console.error(`FAIL ${label}: got ${JSON.stringify(cond)}`);
    process.exit(1);
  }
}

(async () => {
  const refRoot = path.resolve(__dirname, '../../../reference');
  process.env.SIDECOACH_PROJECT_PATH = refRoot;
  const engine = new FlowExecutionEngine();

  // Utterance is chosen to uniquely match flowF_design_tokens.
  // 'lint design.md' is only in flow F's patterns; 'lint' and 'design.md' are
  // intent markers exclusive to flow F. Other tokens-related flows (flowN
  // rapid_iteration_refined, flow11 extract_tokens) do not match these phrases.
  // Generic phrases like 'validate tokens against DESIGN.md' produce ambiguous
  // 3-way matches and cause the orchestrator to short-circuit.
  const result = await engine.process('lint design.md', {
    projectPath: refRoot,
    projectContext: { register: 'brand' } as any,
  });

  if (!result.success) {
    console.error('process() returned non-success:', JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // The aggregate result has guidance from at least one flow.
  const allGuidance = (result.flowResults || []).flatMap((fr: any) => fr.guidance || []).join('\n');
  assertTrue(allGuidance.length > 0, 'process() returned non-empty guidance');

  // The DESIGN.md citation pattern must reach the public path output.
  // This is the T5 gap: if a future change drops enrichContextForHandler from
  // inside engine.process(), this assertion catches it.
  const citationRegex = /Source: DESIGN\.md L\d+/;
  assertTrue(citationRegex.test(allGuidance), 'guidance contains "Source: DESIGN.md L<n>" via process() path');

  const citations = allGuidance.split('\n').filter((l: string) => citationRegex.test(l));
  console.log(`process()-path citations found: ${citations.length}`);
  citations.slice(0, 3).forEach((c: string) => console.log(`  ${c.trim()}`));
  assertTrue(citations.length >= 1, 'at least 1 citation surfaces through process()');

  console.log('sprint3-process-path PASS');
})();
