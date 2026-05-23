import { FlowId } from './types';
import { EntryPointResponse } from './sidecoach-entry-point';
export interface CachedEntryPointResponse {
    response: EntryPointResponse;
    timestamp: number;
    ttl: number;
    hits: number;
}
export interface EntryPointCacheStats {
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    avgResponseTime: number;
    cacheSize: number;
}
export declare class EntryPointCache {
    private cache;
    private totalRequests;
    private cacheHits;
    private cacheMisses;
    private responseTimes;
    private defaultTTL;
    private maxCacheSize;
    constructor(defaultTTL?: number, maxCacheSize?: number);
    private generateCacheKey;
    cacheResponse(utterance: string, response: EntryPointResponse, ttl?: number): void;
    getCachedResponse(utterance: string): EntryPointResponse | undefined;
    invalidateByCommand(command: string): void;
    invalidateByFlow(flowId: FlowId): void;
    recordResponseTime(duration: number): void;
    private enforceMaxSize;
    clearExpired(): void;
    getStats(): EntryPointCacheStats;
    clear(): void;
    resetStats(): void;
}
export declare const globalEntryPointCache: EntryPointCache;
//# sourceMappingURL=sidecoach-entry-point-cache.d.ts.map