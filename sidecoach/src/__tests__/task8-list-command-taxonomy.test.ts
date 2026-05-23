import { createExecutionEngine } from '../sidecoach-orchestrator';

console.log('\n[Task 8] Enhanced /sidecoach list Command with Rich Taxonomy\n');
console.log('='.repeat(80));

const orchestrator = createExecutionEngine();

orchestrator.process('/sidecoach list').then((result: any) => {
  console.log('\n[Test 1] /sidecoach list shows grouped output');
  const guidance = result.guidance || [];

  const hasResearch = guidance.some((g: string) => g.includes('Research Phase'));
  const hasImplement = guidance.some((g: string) => g.includes('Implement Phase'));
  const hasReview = guidance.some((g: string) => g.includes('Review Phase'));
  const hasSpecial = guidance.some((g: string) => g.includes('Special Phase'));

  console.log(`  Research Phase present: ${hasResearch ? 'YES' : 'NO'}`);
  console.log(`  Implement Phase present: ${hasImplement ? 'YES' : 'NO'}`);
  console.log(`  Review Phase present: ${hasReview ? 'YES' : 'NO'}`);
  console.log(`  Special Phase present: ${hasSpecial ? 'YES' : 'NO'}`);

  const hasDescriptions = guidance.some((g: string) => g.includes('-') && g.includes('flows)'));
  console.log(`  Descriptions with flow counts: ${hasDescriptions ? 'YES' : 'NO'}`);

  const allPhasesPresent = hasResearch && hasImplement && hasReview && hasSpecial;
  const hasFlowCounts = guidance.filter((g: string) => /\(\d+\s+flows\)/.test(g)).length >= 4;

  console.log(`\n  Result: ${allPhasesPresent && hasFlowCounts ? 'PASS' : 'FAIL'}`);

  if (allPhasesPresent && hasFlowCounts) {
    console.log('\n[Test 1 Output Sample]:');
    guidance.forEach((g: string) => {
      if (g.includes('Phase') || g.includes('sidecoach')) {
        console.log(`    ${g}`);
      }
    });
  }

  console.log('\n' + '='.repeat(80));
}).catch((error: any) => {
  console.error('Test failed:', error);
  process.exit(1);
});
