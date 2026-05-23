/**
 * Phase G Block 2 Integration Test - Flows Q-V
 * Tests new specialized flows with extended domain validation
 */

import * as fs from 'fs';
import * as path from 'path';
import { FlowQMigrationHandler } from '../flow-handler-migration';
import { FlowRLayoutOptimizationHandler } from '../flow-handler-layout-optimization';
import { FlowSTypographyExcellenceHandler } from '../flow-handler-typography-excellence';
import { FlowTAmbitiousMotionHandler } from '../flow-handler-ambitious-motion';
import { FlowUCurateHandler } from '../flow-handler-curate';
import { FlowVAllSevenQAHandler } from '../flow-handler-all-seven-qa';

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
  if (!fs.existsSync(testFixturePath)) {
    fs.mkdirSync(testFixturePath, { recursive: true });
  }

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
  utterance: 'test flow execution',
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
    spacing: { baseUnit: 8, scale: [4, 8, 12, 16, 24, 32, 48, 64], containerMaxWidth: 1200, gutter: 24 },
    motion: { duration: 200, easing: 'ease-out' },
    accessibility: { wcagLevel: 'AA', contrastRatio: 4.5 },
  },
};

async function runFlowTest(flowHandler: any, flowId: string): Promise<TestResult> {
  const startTime = Date.now();

  console.log(`DEBUG ${flowId}: handler class = ${flowHandler.constructor.name}`);

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

    // Verify guidance and checklist
    if (!result.guidance || !Array.isArray(result.guidance)) {
      console.error(`DEBUG ${flowId}: result.guidance=${result.guidance}, typeof=${typeof result.guidance}`);
      return {
        flow: flowId,
        status: 'fail',
        error: 'Missing guidance array in result',
        executionTime,
      };
    }

    if (!result.checklist || !Array.isArray(result.checklist)) {
      return {
        flow: flowId,
        status: 'fail',
        error: 'Missing checklist array in result',
        executionTime,
      };
    }

    return {
      flow: flowId,
      status: 'pass',
      executionTime,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`DEBUG ${flowId} exception: ${errorMsg}`);
    return {
      flow: flowId,
      status: 'fail',
      error: errorMsg,
      executionTime: Date.now() - startTime,
    };
  }
}

async function runTests() {
  setupTestEnvironment();

  const testSuite = [
    { handler: new FlowQMigrationHandler(), id: 'flowQ_migration' },
    { handler: new FlowRLayoutOptimizationHandler(), id: 'flowR_layout_optimization' },
    { handler: new FlowSTypographyExcellenceHandler(), id: 'flowS_typography_excellence' },
    { handler: new FlowTAmbitiousMotionHandler(), id: 'flowT_ambitious_motion' },
    { handler: new FlowUCurateHandler(), id: 'flowU_curate' },
    { handler: new FlowVAllSevenQAHandler(), id: 'flowV_all_seven_qa' },
  ];

  console.log('Phase G Block 2 Integration Test Suite - Flows Q-V');
  console.log('='.repeat(50));

  const results: TestResult[] = [];
  for (const { handler, id } of testSuite) {
    const result = await runFlowTest(handler, id);
    results.push(result);

    const statusSymbol = result.status === 'pass' ? '✓' : '✗';
    console.log(`${statusSymbol} ${result.flow} (${result.executionTime}ms)`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  }

  console.log('='.repeat(50));

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;

  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
