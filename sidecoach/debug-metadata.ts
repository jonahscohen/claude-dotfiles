import { FlowExecutionEngine } from './src/sidecoach-orchestrator';

async function debug() {
  const engine = new FlowExecutionEngine();
  const result = await engine.process('brand verify', {
    projectPath: process.cwd(),
    utterance: 'brand verify',
  });

  console.log('=== Result Structure ===');
  console.log('flowResults length:', result.flowResults.length);
  if (result.flowResults.length > 0) {
    const first = result.flowResults[0];
    console.log('First result keys:', Object.keys(first));
    console.log('Has executionMetadata:', !!first.executionMetadata);
    console.log('Full first result:', JSON.stringify(first, null, 2));
  }
}

debug().catch(console.error);
