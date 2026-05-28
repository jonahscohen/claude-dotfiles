#!/usr/bin/env ts-node
import type { FlowId } from '../../src/types';
import type { FlowExecutionContext, FlowExecutionResult } from '../../src/flow-handler';
import { LoadedFixture } from './score';
import type { BenchmarkRun, FlowRunResult } from './types';
interface FlowDescriptor {
    flowId: FlowId;
    /** Build a handler instance. */
    build: () => {
        execute: (ctx: FlowExecutionContext) => Promise<FlowExecutionResult>;
    };
}
/** Run one flow against one fixture, capture timing + tier + retry state. */
export declare function runFlowOnFixture(fixture: LoadedFixture, flowDesc: FlowDescriptor): Promise<FlowRunResult>;
export declare function runAll(fixturesDir: string): Promise<BenchmarkRun>;
export {};
//# sourceMappingURL=run-all.d.ts.map