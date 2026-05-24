#!/usr/bin/env node

/**
 * sidecoach artifacts <flow-id>
 *
 * Instantiates a flow handler in dry-run mode and prints the artifacts it would
 * produce (name + description). Useful for discovering what each flow ships.
 *
 * Exit codes:
 *   0 = success, artifacts listed
 *   1 = flow ID not found
 *   2 = usage error / dispatch error
 */

let FlowExecutionEngine;
try {
  ({ FlowExecutionEngine } = require('../dist/sidecoach-orchestrator'));
} catch (err) {
  console.error('artifacts: failed to load ../dist/sidecoach-orchestrator. Run `npm run build` in sidecoach/ first.');
  console.error(err.message);
  process.exit(2);
}

function usage() {
  console.error('Usage: sidecoach-artifacts <flow-id>');
  console.error('       sidecoach-artifacts --list');
  console.error('');
  console.error('Examples:');
  console.error('  sidecoach-artifacts flowG_component_implementation');
  console.error('  sidecoach-artifacts --list   # list all flow IDs');
}

(async () => {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    usage();
    process.exit(args.length === 0 ? 2 : 0);
  }

  const engine = new FlowExecutionEngine();
  const handlers = engine.getHandlers();

  if (args[0] === '--list') {
    console.log('Registered flow IDs:');
    for (const id of handlers.keys()) console.log('  ' + id);
    process.exit(0);
  }

  const flowId = args[0];
  const handler = handlers.get(flowId);
  if (!handler) {
    console.error(`artifacts: unknown flow id "${flowId}". Try --list.`);
    process.exit(1);
  }

  const ctx = {
    utterance: '(artifacts dry-run)',
    metadata: {},
    projectContext: { register: 'brand' },
  };
  let result;
  try {
    result = await handler.execute(ctx);
  } catch (err) {
    console.error(`artifacts: ${flowId} execute() threw:`);
    console.error(err && err.message ? err.message : err);
    process.exit(2);
  }

  const artifacts = result.artifacts || [];
  console.log(`Flow: ${flowId} (${result.flowName})`);
  console.log(`Status: ${result.status}`);
  console.log(`Artifacts: ${artifacts.length}`);
  console.log('');
  for (const a of artifacts) {
    console.log(`  [${a.type}] ${a.name}`);
    if (a.description) console.log(`    ${a.description}`);
  }
  process.exit(0);
})();
