/**
 * Phase I Block 3: Enhanced Context Tracking E2E Test
 * Verifies execution chain tracking, context snapshots, and metadata propagation
 */

import { FlowExecutionEngine } from '../sidecoach-orchestrator';
import { FlowExecutionContext, FlowExecutionResult } from '../flow-handler';

interface TestResult {
  test: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

async function testBlock3() {
  const engine = new FlowExecutionEngine();

  // Test 1: Single flow execution records execution chain
  try {
    const result = await engine.process('brand verify', {
      projectPath: process.cwd(),
      utterance: 'brand verify',
    });

    // Check if execution metadata is recorded
    const hasExecutionMetadata = result.flowResults.some(r => r.executionMetadata);
    results.push({
      test: 'Single flow execution records executionMetadata',
      passed: hasExecutionMetadata,
      message: hasExecutionMetadata ? 'executionMetadata present' : 'executionMetadata missing',
    });

    // Check if execution chain is populated
    const hasExecutionChain = result.flowResults.some(
      r => r.executionMetadata?.executionChain && r.executionMetadata.executionChain.length > 0
    );
    results.push({
      test: 'Single flow execution populates executionChain',
      passed: hasExecutionChain,
      message: hasExecutionChain ? 'chain populated' : 'chain empty',
    });

    // Check if duration is calculated
    const hasDuration = result.flowResults.some(r => r.executionMetadata?.executionDuration !== null);
    results.push({
      test: 'Single flow execution calculates executionDuration',
      passed: hasDuration,
      message: hasDuration ? 'duration calculated' : 'duration missing',
    });

    // Check that flow status is recorded in execution chain
    const chainEntry = result.flowResults[0]?.executionMetadata?.executionChain?.[0];
    const chainHasStatus = chainEntry?.status === 'completed' || chainEntry?.status === 'error';
    results.push({
      test: 'Execution chain entry has status (completed or error)',
      passed: chainHasStatus,
      message: chainHasStatus ? `status: ${chainEntry?.status}` : 'status missing',
    });
  } catch (err) {
    results.push({
      test: 'Single flow execution test',
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 2: Composite flow execution tracks multiple flows in chain
  try {
    const result = await engine.process('/sidecoach composite:composite_research_to_impl', {
      projectPath: process.cwd(),
      utterance: '/sidecoach composite:composite_research_to_impl',
    });

    // Check if composite returns results
    const hasFlowResults = result.flowResults && result.flowResults.length > 0;
    results.push({
      test: 'Composite flow execution returns flowResults',
      passed: hasFlowResults,
      message: hasFlowResults ? `${result.flowResults.length} flows` : 'no results',
    });

    // Check if multiple flows are tracked
    const multipleChains = result.flowResults.some(
      r => r.executionMetadata?.executionChain && r.executionMetadata.executionChain.length > 1
    );
    results.push({
      test: 'Composite flow tracks multiple flows in execution chain',
      passed: multipleChains,
      message: multipleChains ? 'multiple flows tracked' : 'single flow only',
    });
  } catch (err) {
    results.push({
      test: 'Composite flow execution test',
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 3: Context metadata structure validation
  try {
    const result = await engine.process('brand verify', {
      projectPath: process.cwd(),
      utterance: 'brand verify',
    });

    if (result.flowResults.length > 0) {
      const firstResult = result.flowResults[0];
      const metadata = firstResult.executionMetadata;

      // Check structure
      const hasCorrectStructure =
        !!metadata &&
        'executionChain' in metadata &&
        'executionDuration' in metadata;

      results.push({
        test: 'ExecutionMetadata has correct structure',
        passed: hasCorrectStructure,
        message: hasCorrectStructure ? 'structure valid' : 'structure invalid',
      });

      // Check execution chain entry structure
      const chainEntry = metadata?.executionChain?.[0];
      const entryHasRequiredFields =
        !!chainEntry &&
        'flowId' in chainEntry &&
        'flowName' in chainEntry &&
        'startTime' in chainEntry &&
        'status' in chainEntry;

      results.push({
        test: 'ExecutionChainEntry has required fields',
        passed: entryHasRequiredFields,
        message: entryHasRequiredFields
          ? 'all fields present'
          : 'missing required fields',
      });
    }
  } catch (err) {
    results.push({
      test: 'Context metadata structure test',
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 4: Error handling preserves execution metadata
  try {
    const result = await engine.process('unknown flow xyz', {
      projectPath: process.cwd(),
      utterance: 'unknown flow xyz',
    });

    // Even on error, execution metadata should be available
    const hasMetadataOnError = result.flowResults.some(r =>
      r.status === 'error' && r.executionMetadata
    );
    results.push({
      test: 'Error flows record executionMetadata',
      passed: hasMetadataOnError,
      message: hasMetadataOnError ? 'metadata on error' : 'no metadata on error',
    });
  } catch (err) {
    results.push({
      test: 'Error handling test',
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

// Run tests
(async () => {
  await testBlock3();

  // Print results
  console.log('Phase I Block 3: Enhanced Context Tracking E2E Tests');
  console.log('====================================================\n');

  const passed = results.filter(r => r.passed).length;
  console.log(`Results: ${passed}/${results.length} tests passing\n`);

  results.forEach(r => {
    console.log(`  ${r.passed ? '✓' : '✗'} ${r.test}`);
    if (r.message) {
      console.log(`    ${r.message}`);
    }
  });

  console.log(`\nStatus: ${passed === results.length ? 'PASSED' : 'FAILED'}`);
})();

export {};
