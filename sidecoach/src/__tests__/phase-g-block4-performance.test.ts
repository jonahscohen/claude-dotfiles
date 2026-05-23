/**
 * Phase G Block 4: Performance Optimization Test
 * Measures flow execution times and identifies bottlenecks
 * Target: <50ms per flow execution
 */

import * as fs from 'fs';
import * as path from 'path';
import { FlowQMigrationHandler } from '../flow-handler-migration';
import { FlowRLayoutOptimizationHandler } from '../flow-handler-layout-optimization';
import { FlowSTypographyExcellenceHandler } from '../flow-handler-typography-excellence';
import { FlowTAmbitiousMotionHandler } from '../flow-handler-ambitious-motion';
import { FlowUCurateHandler } from '../flow-handler-curate';
import { FlowVAllSevenQAHandler } from '../flow-handler-all-seven-qa';

interface PerformanceResult {
  flowId: string;
  flowName: string;
  executionTime: number;
  status: 'pass' | 'fail';
  meetsTarget: boolean;
  targetMs: number;
}

const PERFORMANCE_TARGET_MS = 50;
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

async function runPerformanceTest(flowHandler: any, flowId: string): Promise<PerformanceResult> {
  const startTime = performance.now();

  try {
    const result = await flowHandler.execute(testContext);
    const executionTime = Math.round((performance.now() - startTime) * 100) / 100;
    const meetsTarget = executionTime < PERFORMANCE_TARGET_MS;

    return {
      flowId,
      flowName: result.flowName || flowId,
      executionTime,
      status: result.status === 'success' ? 'pass' : 'fail',
      meetsTarget,
      targetMs: PERFORMANCE_TARGET_MS,
    };
  } catch (error) {
    const executionTime = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      flowId,
      flowName: flowId,
      executionTime,
      status: 'fail',
      meetsTarget: false,
      targetMs: PERFORMANCE_TARGET_MS,
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

  console.log('Phase G Block 4: Performance Optimization Test');
  console.log(`Target: < ${PERFORMANCE_TARGET_MS}ms per flow`);
  console.log('='.repeat(60));

  const results: PerformanceResult[] = [];
  for (const { handler, id } of testSuite) {
    const result = await runPerformanceTest(handler, id);
    results.push(result);

    const statusSymbol = result.status === 'pass' ? '✓' : '✗';
    const performanceSymbol = result.meetsTarget ? '✓' : '⚠';
    console.log(
      `${statusSymbol} ${result.flowId} - ${result.executionTime}ms ${performanceSymbol} (target: ${result.targetMs}ms)`
    );
  }

  console.log('='.repeat(60));

  const passed = results.filter((r) => r.status === 'pass').length;
  const meetsPerformance = results.filter((r) => r.meetsTarget).length;
  const avgTime = Math.round((results.reduce((sum, r) => sum + r.executionTime, 0) / results.length) * 100) / 100;
  const maxTime = Math.max(...results.map((r) => r.executionTime));
  const minTime = Math.min(...results.map((r) => r.executionTime));

  console.log(`\nResults Summary:`);
  console.log(`  Functional: ${passed}/${results.length} flows passed`);
  console.log(`  Performance: ${meetsPerformance}/${results.length} flows < ${PERFORMANCE_TARGET_MS}ms`);
  console.log(`  Avg execution time: ${avgTime}ms`);
  console.log(`  Min execution time: ${minTime}ms`);
  console.log(`  Max execution time: ${maxTime}ms`);

  if (meetsPerformance < results.length) {
    console.log(`\n⚠️  ${results.length - meetsPerformance} flow(s) exceed performance target`);
    const slowFlows = results.filter((r) => !r.meetsTarget);
    for (const flow of slowFlows) {
      const excess = flow.executionTime - PERFORMANCE_TARGET_MS;
      console.log(`   - ${flow.flowId}: ${excess.toFixed(2)}ms over target`);
    }
  }

  process.exit(meetsPerformance === results.length ? 0 : 1);
}

runTests().catch((error) => {
  console.error('Performance test suite failed:', error);
  process.exit(1);
});
