"use strict";
// Phase IV Block 4: Entry Point Performance Optimization
// Caching layer for entry point routing decisions
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalEntryPointCache = exports.EntryPointCache = void 0;
class EntryPointCache {
    constructor(defaultTTL = 300000, maxCacheSize = 500) {
        this.cache = new Map();
        this.totalRequests = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.responseTimes = [];
        this.defaultTTL = 300000; // 5 minutes
        this.maxCacheSize = 500;
        this.defaultTTL = defaultTTL;
        this.maxCacheSize = maxCacheSize;
    }
    generateCacheKey(utterance) {
        return `entry:${utterance.toLowerCase().trim()}`;
    }
    cacheResponse(utterance, response, ttl) {
        const key = this.generateCacheKey(utterance);
        const entry = {
            response,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL,
            hits: 0,
        };
        this.cache.set(key, entry);
        this.enforceMaxSize();
    }
    getCachedResponse(utterance) {
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
    invalidateByCommand(command) {
        for (const [key, entry] of this.cache.entries()) {
            if (key.includes(command)) {
                this.cache.delete(key);
            }
        }
    }
    invalidateByFlow(flowId) {
        for (const [key, entry] of this.cache.entries()) {
            if (entry.response.selectedFlows.includes(flowId)) {
                this.cache.delete(key);
            }
        }
    }
    recordResponseTime(duration) {
        this.responseTimes.push(duration);
        if (this.responseTimes.length > 1000) {
            this.responseTimes.shift();
        }
    }
    enforceMaxSize() {
        if (this.cache.size > this.maxCacheSize) {
            const entries = Array.from(this.cache.entries())
                .sort((a, b) => a[1].hits - b[1].hits);
            const toRemove = entries.length - this.maxCacheSize;
            for (let i = 0; i < toRemove; i++) {
                this.cache.delete(entries[i][0]);
            }
        }
    }
    clearExpired() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }
    }
    getStats() {
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
    clear() {
        this.cache.clear();
        this.totalRequests = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.responseTimes = [];
    }
    resetStats() {
        this.totalRequests = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.responseTimes = [];
    }
}
exports.EntryPointCache = EntryPointCache;
// Global singleton instance
exports.globalEntryPointCache = new EntryPointCache();
//# sourceMappingURL=sidecoach-entry-point-cache.js.map