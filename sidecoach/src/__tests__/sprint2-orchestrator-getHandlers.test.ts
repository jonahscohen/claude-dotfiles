import { FlowExecutionEngine } from '../sidecoach-orchestrator';

function assertTrue(cond: any, label: string): void {
  if (!cond) {
    console.error(`FAIL ${label}: got ${JSON.stringify(cond)}`);
    process.exit(1);
  }
}

(() => {
  const engine = new FlowExecutionEngine();
  // Method exists and is a function
  assertTrue(typeof (engine as any).getHandlers === 'function', 'engine.getHandlers is a function');
  const handlers = (engine as any).getHandlers();
  // Returns a Map-like with .get() and .keys()
  assertTrue(typeof handlers.get === 'function', 'handlers.get is a function');
  assertTrue(typeof handlers.keys === 'function', 'handlers.keys is a function');
  // Includes the new flow IDs from earlier tasks
  assertTrue(handlers.get('flowW_landing_composition') != null, 'flowW handler present');
  assertTrue(handlers.get('flowX_copywriting') != null, 'flowX handler present');
  // Read-only contract: mutation methods are absent or throw. We do not enforce immutability at runtime
  // because Map's interface is broad; the contract is just "do not mutate."
  console.log('sprint2-orchestrator-getHandlers PASS');
})();
