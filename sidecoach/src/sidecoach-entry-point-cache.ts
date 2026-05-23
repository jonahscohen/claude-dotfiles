// Phase IV Block 4: Entry Point Performance Optimization
// Caching layer for entry point routing decisions

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

export class EntryPointCache {
  private cache: Map<string, CachedEntryPointResponse> = new Map();
  private totalRequests: number = 0;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private responseTimes: number[] = [];

  private defaultTTL: number = 300000; // 5 minutes
  private maxCacheSize: number = 500;

  constructor(defaultTTL: number = 300000, maxCacheSize: number = 500) {
    this.defaultTTL = defaultTTL;
    this.maxCacheSize = maxCacheSize;
  }

  private generateCacheKey(utterance: string): string {
    return `entry:${utterance.toLowerCase().trim()}`;
  }

  cacheResponse(utterance: string, response: EntryPointResponse, ttl?: number): void {
    const key = this.generateCacheKey(utterance);
    const entry: CachedEntryPointResponse = {
      response,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0,
    };

    this.cache.set(key, entry);
    this.enforceMaxSize();
  }

  getCachedResponse(utterance: string): EntryPointResponse | undefined {
    const key = this.generateCacheKey(utterance);
    const entry = this.cache.get(key);

    this.totalRequests++;

    if (!entry) {
      this.cacheMisses++;
      return undefined;
    }

    // Check TTL expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.cacheMisses++;
      return undefined;
    }

    entry.hits++;
    this.cacheHits++;
    return entry.response;
  }

  invalidateByCommand(command: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (key.includes(command)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateByFlow(flowId: FlowId): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.response.selectedFlows.includes(flowId)) {
        this.cache.delete(key);
      }
    }
  }

  recordResponseTime(duration: number): void {
    this.responseTimes.push(duration);
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
  }

  private enforceMaxSize(): void {
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].hits - b[1].hits);

      const toRemove = entries.length - this.maxCacheSize;
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): EntryPointCacheStats {
    const hitRate = this.totalRequests > 0
      ? (this.cacheHits / this.totalRequests) * 100
      : 0;

    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    return {
      totalRequests: this.totalRequests,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      cacheSize: this.cache.size,
    };
  }

  clear(): void {
    this.cache.clear();
    this.totalRequests = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.responseTimes = [];
  }

  resetStats(): void {
    this.totalRequests = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.responseTimes = [];
  }
}

// Global singleton instance
export const globalEntryPointCache = new EntryPointCache();
