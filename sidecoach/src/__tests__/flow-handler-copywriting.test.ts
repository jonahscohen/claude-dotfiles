import { FlowXCopywritingHandler } from '../flow-handler-copywriting';

function assertTrue(cond: any, label: string): void {
  if (!cond) {
    console.error(`FAIL ${label}: got ${JSON.stringify(cond)}`);
    process.exit(1);
  }
}

(async () => {
  const handler = new FlowXCopywritingHandler();
  assertTrue(handler.flowId === 'flowX_copywriting', 'flowId is flowX_copywriting');

  // canExecute requires register
  assertTrue(handler.canExecute({ utterance: 'copy' } as any) === false, 'canExecute false without register');
  assertTrue(
    handler.canExecute({ utterance: 'copy', projectContext: { register: 'product' } } as any) === true,
    'canExecute true with product register'
  );

  // execute with explicit sectionIds in metadata
  const result = await handler.execute({
    utterance: 'draft hero copy',
    projectContext: {
      register: 'product',
      product: { content: 'Acme is a workspace for customer feedback.' },
      design: {},
    },
    metadata: {
      sectionIds: ['hero'],
      productName: 'Acme',
    },
  } as any);
  assertTrue(result.status === 'success', 'execute success');
  const guidance = (result.guidance || []).join('\n');
  assertTrue(/headline/i.test(guidance), 'guidance mentions headline slot');
  assertTrue(/primary_cta|CTA/i.test(guidance), 'guidance mentions CTA slot');
  // 2-3 options per slot - count "Option 1" / "Option 2" markers
  const option1Count = (guidance.match(/Option 1:/g) || []).length;
  const option2Count = (guidance.match(/Option 2:/g) || []).length;
  assertTrue(option1Count >= 1, 'at least one slot has Option 1');
  assertTrue(option2Count >= 1, 'at least one slot has Option 2');

  // Product name substitution
  assertTrue(guidance.includes('Acme'), 'product name substituted into samples');

  // Default to first hero section when no sectionIds given
  const fallbackResult = await handler.execute({
    utterance: 'draft copy',
    projectContext: { register: 'brand', product: {}, design: {} },
    metadata: {},
  } as any);
  assertTrue(fallbackResult.status === 'success', 'fallback (no sectionIds) succeeds');
  const fallbackGuidance = (fallbackResult.guidance || []).join('\n');
  assertTrue(/Hero/i.test(fallbackGuidance), 'fallback covers Hero section');

  console.log('flow-handler-copywriting PASS');
})();
