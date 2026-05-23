"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sidecoach_orchestrator_1 = require("../sidecoach-orchestrator");
console.log('\n[Task 8] Enhanced /sidecoach list Command with Rich Taxonomy\n');
console.log('='.repeat(80));
const orchestrator = (0, sidecoach_orchestrator_1.createExecutionEngine)();
orchestrator.process('/sidecoach list').then((result) => {
    console.log('\n[Test 1] /sidecoach list shows grouped output');
    const guidance = result.guidance || [];
    const hasResearch = guidance.some((g) => g.includes('Research Phase'));
    const hasImplement = guidance.some((g) => g.includes('Implement Phase'));
    const hasReview = guidance.some((g) => g.includes('Review Phase'));
    const hasSpecial = guidance.some((g) => g.includes('Special Phase'));
    console.log(`  Research Phase present: ${hasResearch ? 'YES' : 'NO'}`);
    console.log(`  Implement Phase present: ${hasImplement ? 'YES' : 'NO'}`);
    console.log(`  Review Phase present: ${hasReview ? 'YES' : 'NO'}`);
    console.log(`  Special Phase present: ${hasSpecial ? 'YES' : 'NO'}`);
    const hasDescriptions = guidance.some((g) => g.includes('-') && g.includes('flows)'));
    console.log(`  Descriptions with flow counts: ${hasDescriptions ? 'YES' : 'NO'}`);
    const allPhasesPresent = hasResearch && hasImplement && hasReview && hasSpecial;
    const hasFlowCounts = guidance.filter((g) => /\(\d+\s+flows\)/.test(g)).length >= 4;
    console.log(`\n  Result: ${allPhasesPresent && hasFlowCounts ? 'PASS' : 'FAIL'}`);
    if (allPhasesPresent && hasFlowCounts) {
        console.log('\n[Test 1 Output Sample]:');
        guidance.forEach((g) => {
            if (g.includes('Phase') || g.includes('sidecoach')) {
                console.log(`    ${g}`);
            }
        });
    }
    console.log('\n' + '='.repeat(80));
}).catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
});
//# sourceMappingURL=task8-list-command-taxonomy.test.js.map