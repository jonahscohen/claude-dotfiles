/**
 * Phase F Integration Test - Full Suite with Fixtures
 * Tests all flows with proper project context and PRODUCT.md fixture
 */

import * as fs from 'fs';
import * as path from 'path';
import { FlowABrandVerifyHandler } from '../flow-handler-brand-verify';
import { FlowBComponentResearchHandler } from '../flow-handler-component-research';
import { FlowCFontResearchHandler } from '../flow-handler-font-research';
import { FlowDReferenceSearchHandler } from '../flow-handler-design-references';
import { FlowEMotionPatternsHandler } from '../flow-handler-motion-patterns';
import { FlowFDesignTokensHandler } from '../flow-handler-design-tokens';
import { FlowGComponentImplementationHandler } from '../flow-handler-component-implementation';
import { FlowHMotionIntegrationHandler } from '../flow-handler-motion-integration';
import { FlowIAccessibilityHandler } from '../flow-handler-accessibility';

interface TestResult {
  flow: string;
  status: 'pass' | 'fail';
  error?: string;
  executionTime?: number;
  domainsValidated?: number;
}

const testFixturePath = path.join(__dirname, 'fixtures');
const productMdPath = path.join(testFixturePath, 'PRODUCT.md');

function setupTestEnvironment() {
  // Ensure fixture directory exists
  if (!fs.existsSync(testFixturePath)) {
    fs.mkdirSync(testFixturePath, { recursive: true });
  }

  // Ensure PRODUCT.md fixture exists
  if (!fs.existsSync(productMdPath)) {
    fs.writeFileSync(
      productMdPath,
      `# Project Strategy

## Register
Product design

## Primary Users
Product designers and developers

## Brand Personality
Modern and focused

## Anti-References
- Skeuomorphism
- Over-animation

## Strategic Principles
- Clarity > Decoration
- Accessibility first
`
    );
  }
}

const testContext = {
  projectPath: testFixturePath,
  projectContext: {
    product: {
      brandPersonality: 'modern',
      register: 'product',
    },
    register: 'product',
  },
  metadata: {
    componentName: 'button',
    designTokens: { primary: '#3b82f6', spacing: 8 },
    componentTree: { nodeCount: 5 },
    cssRules: ['body { margin: 0; }'],
    colors: { primary: '#3b82f6', secondary: '#10b981' },
    typography: { body: 'system-ui', heading: 'system-ui' },
    spacing: { base: 8, scale: 1.5 },
    motion: { duration: 200, easing: 'ease-out' },
    accessibility: { wcagLevel: 'AA', contrastRatio: 4.5 },
  },
};

async function runFlowTest(flowHandler: any, flowId: string): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const result = await flowHandler.execute(testContext);
    const executionTime = Date.now() - startTime;

    // Verify result structure
    if (!result.flowId || !result.status) {
      return {
        flow: flowId,
        status: 'fail',
        error: 'Missing flowId or status in result',
        executionTime,
      };
    }

    // Count domain validations in guidance
    const domainsValidated = result.guidance ? result.guidance.filter((line: string) => /domain:.*rules passing/.test(line)).length : 0;

    return {
      flow: flowId,
      status: 'pass',
      executionTime,
      domainsValidated,
    };
  } catch (err) {
    return {
      flow: flowId,
      status: 'fail',
      error: String(err).substring(0, 60),
      executionTime: Date.now() - startTime,
    };
  }
}

async function runFullIntegration() {
  console.log('\n================================================================================');
  console.log('Phase F Integration Test - Full Suite with Fixtures');
  console.log('================================================================================\n');

  setupTestEnvironment();
  console.log(`Test fixture path: ${testFixturePath}`);
  console.log(`PRODUCT.md exists: ${fs.existsSync(productMdPath)}\n`);

  const flows = [
    { handler: new FlowABrandVerifyHandler(), id: 'flowA_brand_verify' },
    { handler: new FlowBComponentResearchHandler(), id: 'flowB_component_research' },
    { handler: new FlowCFontResearchHandler(), id: 'flowC_font_research' },
    { handler: new FlowDReferenceSearchHandler(), id: 'flowD_reference_search' },
    { handler: new FlowEMotionPatternsHandler(), id: 'flowE_motion_patterns' },
    { handler: new FlowFDesignTokensHandler(), id: 'flowF_design_tokens' },
    { handler: new FlowGComponentImplementationHandler(), id: 'flowG_component_implementation' },
    { handler: new FlowHMotionIntegrationHandler(), id: 'flowH_motion_integration' },
    { handler: new FlowIAccessibilityHandler(), id: 'flowI_accessibility' },
  ];

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  let totalDomains = 0;

  for (const flow of flows) {
    process.stdout.write(`${flow.id.padEnd(35)} `);
    const result = await runFlowTest(flow.handler, flow.id);
    results.push(result);

    if (result.status === 'pass') {
      console.log(`✓ PASS (${result.executionTime}ms)`);
      if (result.domainsValidated) {
        console.log(`  Domain validations: ${result.domainsValidated}`);
        totalDomains += result.domainsValidated;
      }
      passed++;
    } else {
      console.log(`✗ FAIL`);
      console.log(`  ${result.error}`);
      failed++;
    }
  }

  console.log('\n================================================================================');
  console.log(`Results: ${passed} passed, ${failed} failed out of ${flows.length} tests`);
  console.log(`Success rate: ${((passed / flows.length) * 100).toFixed(1)}%`);
  console.log(`Total domain validations detected: ${totalDomains}`);
  console.log('================================================================================\n');

  if (failed === 0) {
    console.log('✓ Phase F Full Integration: ALL TESTS PASSED');
    console.log('Production integration ready for Phase G deployment.\n');
    process.exit(0);
  } else {
    console.log(`✗ Phase F Full Integration: ${failed} test(s) failed`);
    process.exit(1);
  }
}

runFullIntegration().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
