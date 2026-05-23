"use strict";
// Phase III Block 4: Performance Optimization
// Handler caching, context reuse, and query optimization
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalPerformanceCache = exports.FlowHandlerCache = void 0;
class FlowHandlerCache {
    constructor(defaultTTL = 60000, maxCacheSize = 1000) {
        this.handlerCache = new Map();
        this.contextCache = new Map();
        this.validatorCache = new Map();
        this.queryCache = new Map();
        this.totalHits = 0;
        this.totalMisses = 0;
        this.defaultTTL = 60000; // 60 seconds default
        this.maxCacheSize = 1000;
        this.defaultTTL = defaultTTL;
        this.maxCacheSize = maxCacheSize;
    }
    // Handler result caching
    cacheHandlerResult(flowId, result, ttl) {
        const key = `handler:${flowId}`;
        const entry = {
            value: result,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL,
            hits: 0,
        };
        this.handlerCache.set(key, entry);
        this.enforceMaxSize(this.handlerCache);
    }
    getHandlerResult(flowId) {
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
    cacheContext(contextId, context, ttl) {
        const key = `context:${contextId}`;
        const entry = {
            value: context,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL,
            hits: 0,
        };
        this.contextCache.set(key, entry);
        this.enforceMaxSize(this.contextCache);
    }
    getContext(contextId) {
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
    cacheValidatorResult(validatorKey, result, ttl) {
        const key = `validator:${validatorKey}`;
        const entry = {
            value: result,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL,
            hits: 0,
        };
        this.validatorCache.set(key, entry);
        this.enforceMaxSize(this.validatorCache);
    }
    getValidatorResult(validatorKey) {
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
    cacheQueryResult(query, result, ttl) {
        const key = `query:${query}`;
        const entry = {
            value: result,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL,
            hits: 0,
        };
        this.queryCache.set(key, entry);
        this.enforceMaxSize(this.queryCache);
    }
    getQueryResult(query) {
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
    invalidateFlow(flowId) {
        this.handlerCache.delete(`handler:${flowId}`);
    }
    invalidateContext(contextId) {
        this.contextCache.delete(`context:${contextId}`);
    }
    invalidateQuery(query) {
        this.queryCache.delete(`query:${query}`);
    }
    clearExpired() {
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
    getStats() {
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
    enforceMaxSize(cache) {
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
    clear() {
        this.handlerCache.clear();
        this.contextCache.clear();
        this.validatorCache.clear();
        this.queryCache.clear();
        this.totalHits = 0;
        this.totalMisses = 0;
    }
    resetStats() {
        this.totalHits = 0;
        this.totalMisses = 0;
    }
}
exports.FlowHandlerCache = FlowHandlerCache;
// Global singleton instance
exports.globalPerformanceCache = new FlowHandlerCache();
//# sourceMappingURL=flow-performance-cache.js.map