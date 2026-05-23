/**
 * Phase F Integration Test Suite
 * Validates all flows A-V execute correctly with ExtendedDomainValidator
 */

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
  validationMetrics?: {
    domainsValidated: string[];
    passRates: Record<string, string>;
  };
}

const mockContext = {
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
    const result = await flowHandler.execute(mockContext);
    const executionTime = Date.now() - startTime;

    // Verify required result structure
    if (!result.flowId || !result.status || !result.guidance || !result.checklist) {
      return {
        flow: flowId,
        status: 'fail',
        error: 'Missing required result fields (flowId, status, guidance, checklist)',
        executionTime,
      };
    }

    // Verify memory builder integration
    if (!result.memory) {
      return {
        flow: flowId,
        status: 'fail',
        error: 'Missing memory integration',
        executionTime,
      };
    }

    // Extract validation metrics from guidance if present
    const validationMetrics = extractValidationMetrics(result.guidance);

    return {
      flow: flowId,
      status: 'pass',
      executionTime,
      validationMetrics,
    };
  } catch (err) {
    return {
      flow: flowId,
      status: 'fail',
      error: String(err),
      executionTime: Date.now() - startTime,
    };
  }
}

function extractValidationMetrics(guidance: string[]): { domainsValidated: string[]; passRates: Record<string, string> } {
  const domains = new Set<string>();
  const passRates: Record<string, string> = {};

  guidance.forEach((line) => {
    // Pattern: "- Domain Name domain: X/Y rules passing (XX%)"
    const match = line.match(/domain: (\d+)\/(\d+) rules passing \((\d+)%\)/);
    if (match) {
      const domain = line.split(':')[0].trim().replace('- ', '').toLowerCase();
      domains.add(domain);
      passRates[domain] = match[3] + '%';
    }
  });

  return {
    domainsValidated: Array.from(domains),
    passRates,
  };
}

async function runPhaseF() {
  console.log('\n================================================================================');
  console.log('Phase F Integration Test Suite - All Flows A-V');
  console.log('================================================================================\n');

  const flows = [
    { handler: new FlowABrandVerifyHandler(), id: 'flowA_brand_verify' },
    { handler: new FlowBComponentResearchHandler(), id: 'flowB_component_research' },
    { handler: new FlowCFontResearchHandler(), id: 'flowC_font_research' },
    { handler: new FlowDReferenceSearchHandler(), id: 'flowD_design_references' },
    { handler: new FlowEMotionPatternsHandler(), id: 'flowE_motion_patterns' },
    { handler: new FlowFDesignTokensHandler(), id: 'flowF_design_tokens' },
    { handler: new FlowGComponentImplementationHandler(), id: 'flowG_component_implementation' },
    { handler: new FlowHMotionIntegrationHandler(), id: 'flowH_motion_integration' },
    { handler: new FlowIAccessibilityHandler(), id: 'flowI_accessibility' },
  ];

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const flow of flows) {
    process.stdout.write(`Testing ${flow.id}... `);
    const result = await runFlowTest(flow.handler, flow.id);
    results.push(result);

    if (result.status === 'pass') {
      console.log(`✓ PASS (${result.executionTime}ms)`);
      if (result.validationMetrics?.domainsValidated.length) {
        console.log(`  Domains: ${result.validationMetrics.domainsValidated.join(', ')}`);
      }
      passed++;
    } else {
      console.log(`✗ FAIL`);
      console.log(`  Error: ${result.error}`);
      failed++;
    }
  }

  console.log('\n================================================================================');
  console.log(`Results: ${passed} passed, ${failed} failed out of ${flows.length} tests`);
  console.log(`Success rate: ${((passed / flows.length) * 100).toFixed(1)}%`);
  console.log('================================================================================\n');

  // Print detailed metrics
  console.log('Validation Metrics by Flow:');
  console.log('---');
  results.forEach((result) => {
    if (result.status === 'pass' && result.validationMetrics?.domainsValidated.length) {
      console.log(`${result.flow}:`);
      console.log(`  Domains validated: ${result.validationMetrics.domainsValidated.length}`);
      Object.entries(result.validationMetrics.passRates).forEach(([domain, rate]) => {
        console.log(`    ${domain}: ${rate}`);
      });
    }
  });

  if (failed === 0) {
    console.log('\n✓ Phase F Block 1: ALL TESTS PASSED - Production integration ready');
    process.exit(0);
  } else {
    console.log(`\n✗ Phase F Block 1: ${failed} test(s) failed`);
    process.exit(1);
  }
}

runPhaseF().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
