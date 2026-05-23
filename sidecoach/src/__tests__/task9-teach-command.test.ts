import { createExecutionEngine } from '../sidecoach-orchestrator';
import * as fs from 'fs';
import * as path from 'path';

console.log('\n[Task 9] /sidecoach teach Command (PRODUCT.md Setup)\n');
console.log('='.repeat(80));

const orchestrator = createExecutionEngine();
const testDir = '/tmp/sidecoach-teach-test';

// Create test directory
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

orchestrator.process('/sidecoach teach', { projectPath: testDir }).then((result: any) => {
  console.log('\n[Test 1] /sidecoach teach creates PRODUCT.md');

  const productMdPath = path.join(testDir, 'PRODUCT.md');
  const fileExists = fs.existsSync(productMdPath);

  console.log(`  File created: ${fileExists ? 'YES' : 'NO'}`);

  if (fileExists) {
    const content = fs.readFileSync(productMdPath, 'utf-8');
    const hasRegister = content.includes('Register');
    const hasUsers = content.includes('Primary Users');
    const hasAntiRefs = content.includes('Anti-References');
    const hasPrinciples = content.includes('Strategic Principles');

    console.log(`  Has Register section: ${hasRegister ? 'YES' : 'NO'}`);
    console.log(`  Has Primary Users: ${hasUsers ? 'YES' : 'NO'}`);
    console.log(`  Has Anti-References: ${hasAntiRefs ? 'YES' : 'NO'}`);
    console.log(`  Has Strategic Principles: ${hasPrinciples ? 'YES' : 'NO'}`);

    const allSectionsPresent = hasRegister && hasUsers && hasAntiRefs && hasPrinciples;
    console.log(`\n  Result: ${allSectionsPresent ? 'PASS' : 'FAIL'}`);
  } else {
    console.log('\n  Result: FAIL');
  }

  // Test 2: Check result structure
  console.log('\n[Test 2] /sidecoach teach result structure');
  const hasGuidance = result.guidance && result.guidance.length > 0;
  const hasChecklist = result.checklist && result.checklist.length > 0;
  const hasArtifacts = result.artifacts && result.artifacts.length > 0;
  const resultSuccess = result.success === true;

  console.log(`  Success flag: ${resultSuccess ? 'YES' : 'NO'}`);
  console.log(`  Guidance items: ${result.guidance ? result.guidance.length : 0}`);
  console.log(`  Checklist items: ${result.checklist ? result.checklist.length : 0}`);
  console.log(`  Artifacts: ${result.artifacts ? result.artifacts.length : 0}`);

  const structureValid = hasGuidance && hasChecklist && hasArtifacts && resultSuccess;
  console.log(`\n  Result: ${structureValid ? 'PASS' : 'FAIL'}`);

  console.log('\n' + '='.repeat(80));
}).catch((error: any) => {
  console.error('Test failed:', error);
  process.exit(1);
});
