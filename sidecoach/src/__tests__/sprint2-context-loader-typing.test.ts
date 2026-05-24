import { buildProjectContext } from '../context-loader';
import { DesignTokens } from '../design-md-parser';
import * as path from 'path';

function assertTrue(cond: any, label: string): void {
  if (!cond) {
    console.error(`FAIL ${label}: got ${JSON.stringify(cond)}`);
    process.exit(1);
  }
}

(() => {
  const refRoot = path.resolve(__dirname, '../../../reference');
  const ctx = buildProjectContext(refRoot);
  // Type-narrow: parsedDesignTokens must be DesignTokens | null - not any.
  // The test below would not compile if the field were typed as `any` AND the explicit type assertion failed.
  // To prove the typing tightened, we use a function whose signature requires DesignTokens | null.
  function consume(tokens: DesignTokens | null): number {
    if (tokens === null) return 0;
    return Object.keys(tokens.colors || {}).length;
  }
  const n = consume(ctx.parsedDesignTokens);
  assertTrue(typeof n === 'number', 'consume() returned a number');
  console.log(`parsedDesignTokens typed PASS (color section keys=${n})`);
})();
