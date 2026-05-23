// Phase III Block 4: Performance Optimization
// Handler caching, context reuse, and query optimization

import { FlowExecutionContext, FlowExecutionResult } from './flow-handler';
import { FlowId } from './types';

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number; // milliseconds
  hits: number;
}

export interface CacheStats {
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  cacheSize: number;
  avgTTL: number;
}

export class FlowHandlerCache {
  private handlerCache: Map<string, CacheEntry<any>> = new Map();
  private contextCache: Map<string, CacheEntry<FlowExecutionContext>> = new Map();
  private validatorCache: Map<string, CacheEntry<any>> = new Map();
  private queryCache: Map<string, CacheEntry<any[]>> = new Map();

  private totalHits: number = 0;
  private totalMisses: number = 0;

  private defaultTTL: number = 60000; // 60 seconds default
  private maxCacheSize: number = 1000;

  constructor(defaultTTL: number = 60000, maxCacheSize: number = 1000) {
    this.defaultTTL = defaultTTL;
    this.maxCacheSize = maxCacheSize;
  }

  // Handler result caching
  cacheHandlerResult(flowId: FlowId, result: FlowExecutionResult, ttl?: number): void {
    const key = `handler:${flowId}`;
    const entry: CacheEntry<FlowExecutionResult> = {
      value: result,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0,
    };

    this.handlerCache.set(key, entry);
    this.enforceMaxSize(this.handlerCache);
  }

  getHandlerResult(flowId: FlowId): FlowExecutionResult | undefined {
    const key = `handler:${flowId}`;
    const entry = this.handlerCache.get(key);

    if (!entry) {
      this.totalMisses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.handlerCache.delete(key);
      this.totalMisses++;
      return undefined;
    }

    entry.hits++;
    this.totalHits++;
    return entry.value;
  }

  // Context reuse pool
  cacheContext(contextId: string, context: FlowExecutionContext, ttl?: number): void {
    const key = `context:${contextId}`;
    const entry: CacheEntry<FlowExecutionContext> = {
      value: context,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0,
    };

    this.contextCache.set(key, entry);
    this.enforceMaxSize(this.contextCache);
  }

  getContext(contextId: string): FlowExecutionContext | undefined {
    const key = `context:${contextId}`;
    const entry = this.contextCache.get(key);

    if (!entry) {
      this.totalMisses++;
      return undefined;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.contextCache.delete(key);
      this.totalMisses++;
      return undefined;
    }

    entry.hits++;
    this.totalHits++;
    return entry.value;
  }

  // Validator result caching
  cacheValidatorResult(validatorKey: string, result: any, ttl?: number): void {
    const key = `validator:${validatorKey}`;
    const entry: CacheEntry<any> = {
      value: result,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0,
    };

    this.validatorCache.set(key, entry);
    this.enforceMaxSize(this.validatorCache);
  }

  getValidatorResult(validatorKey: string): any | undefined {
    const key = `validator:${validatorKey}`;
    const entry = this.validatorCache.get(key);

    if (!entry) {
      this.totalMisses++;
      return undefined;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.validatorCache.delete(key);
      this.totalMisses++;
      return undefined;
    }

    entry.hits++;
    this.totalHits++;
    return entry.value;
  }

  // Query result caching
  cacheQueryResult(query: string, result: any[], ttl?: number): void {
    const key = `query:${query}`;
    const entry: CacheEntry<any[]> = {
      value: result,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0,
    };

    this.queryCache.set(key, entry);
    this.enforceMaxSize(this.queryCache);
  }

  getQueryResult(query: string): any[] | undefined {
    const key = `query:${query}`;
    const entry = this.queryCache.get(key);

    if (!entry) {
      this.totalMisses++;
      return undefined;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.queryCache.delete(key);
      this.totalMisses++;
      return undefined;
    }

    entry.hits++;
    this.totalHits++;
    return entry.value;
  }

  // Cache invalidation
  invalidateFlow(flowId: FlowId): void {
    this.handlerCache.delete(`handler:${flowId}`);
  }

  invalidateContext(contextId: string): void {
    this.contextCache.delete(`context:${contextId}`);
  }

  invalidateQuery(query: string): void {
    this.queryCache.delete(`query:${query}`);
  }

  clearExpired(): void {
    const now = Date.now();

    for (const [key, entry] of this.handlerCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.handlerCache.delete(key);
      }
    }

    for (const [key, entry] of this.contextCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.contextCache.delete(key);
      }
    }

    for (const [key, entry] of this.validatorCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.validatorCache.delete(key);
      }
    }

    for (const [key, entry] of this.queryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.queryCache.delete(key);
      }
    }
  }

  // Cache statistics
  getStats(): CacheStats {
    const totalRequests = this.totalHits + this.totalMisses;
    const hitRate = totalRequests > 0 ? (this.totalHits / totalRequests) * 100 : 0;
    const cacheSize = this.handlerCache.size + this.contextCache.size + this.validatorCache.size + this.queryCache.size;

    const allEntries = [
      ...Array.from(this.handlerCache.values()),
      ...Array.from(this.contextCache.values()),
      ...Array.from(this.validatorCache.values()),
      ...Array.from(this.queryCache.values()),
    ];

    const avgTTL = allEntries.length > 0
      ? allEntries.reduce((sum, entry) => sum + entry.ttl, 0) / allEntries.length
      : 0;

    return {
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      cacheSize,
      avgTTL: Math.round(avgTTL),
    };
  }

  // Utility methods
  private enforceMaxSize(cache: Map<string, any>): void {
    if (cache.size > this.maxCacheSize) {
      // Remove least recently used (lowest hits)
      const entries = Array.from(cache.entries())
        .sort((a, b) => a[1].hits - b[1].hits);

      const toRemove = entries.length - this.maxCacheSize;
      for (let i = 0; i < toRemove; i++) {
        cache.delete(entries[i][0]);
      }
    }
  }

  clear(): void {
    this.handlerCache.clear();
    this.contextCache.clear();
    this.validatorCache.clear();
    this.queryCache.clear();
    this.totalHits = 0;
    this.totalMisses = 0;
  }

  resetStats(): void {
    this.totalHits = 0;
    this.totalMisses = 0;
  }
}

// Global singleton instance
export const globalPerformanceCache = new FlowHandlerCache();
