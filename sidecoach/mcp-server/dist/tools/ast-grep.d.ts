import { astGrepShape, type AstGrepInputT } from '../schemas';
import type { ToolDefinition, ToolHandler } from './types';
export declare const definition: ToolDefinition<typeof astGrepShape>;
/** Test seam - reset the probe cache so tests can switch PATH between cases. */
export declare function _resetAstGrepProbe(): void;
export declare const handler: ToolHandler<AstGrepInputT>;
//# sourceMappingURL=ast-grep.d.ts.map