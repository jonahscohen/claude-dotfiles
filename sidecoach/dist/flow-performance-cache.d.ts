import { FlowExecutionContext, FlowExecutionResult } from './flow-handler';
import { FlowId } from './types';
export interface CacheEntry<T> {
    value: T;
    timestamp: number;
    ttl: number;
    hits: number;
}
export interface CacheStats {
    totalHits: number;
    totalMisses: number;
    hitRate: number;
    cacheSize: number;
    avgTTL: number;
}
export declare class FlowHandlerCache {
    private handlerCache;
    private contextCache;
    private validatorCache;
    private queryCache;
    private totalHits;
    private totalMisses;
    private defaultTTL;
    private maxCacheSize;
    constructor(defaultTTL?: number, maxCacheSize?: number);
    cacheHandlerResult(flowId: FlowId, result: FlowExecutionResult, ttl?: number): void;
    getHandlerResult(flowId: FlowId): FlowExecutionResult | undefined;
    cacheContext(contextId: string, context: FlowExecutionContext, ttl?: number): void;
    getContext(contextId: string): FlowExecutionContext | undefined;
    cacheValidatorResult(validatorKey: string, result: any, ttl?: number): void;
    getValidatorResult(validatorKey: string): any | undefined;
    cacheQueryResult(query: string, result: any[], ttl?: number): void;
    getQueryResult(query: string): any[] | undefined;
    invalidateFlow(flowId: FlowId): void;
    invalidateContext(contextId: string): void;
    invalidateQuery(query: string): void;
    clearExpired(): void;
    getStats(): CacheStats;
    private enforceMaxSize;
    clear(): void;
    resetStats(): void;
}
export declare const globalPerformanceCache: FlowHandlerCache;
//# sourceMappingURL=flow-performance-cache.d.ts.map