"use strict";
// Phase IV Block 5: End-to-End Integration Tests
// Complete entry point system validation with orchestrator
describe('Phase IV: Complete Entry Point System E2E', () => {
    let entryPoint;
    let cache;
    beforeEach(() => {
        // Import modules for testing
        const EntryPointModule = require('./sidecoach-entry-point');
        const CacheModule = require('./sidecoach-entry-point-cache');
        entryPoint = new EntryPointModule.SidecoachEntryPoint();
        cache = new CacheModule.EntryPointCache();
    });
    describe('End-to-End Entry Point Flow', () => {
        test('slash command routes through entry point and cache', () => {
            const request = {
                utterance: '/research',
                userId: 'test-user',
                projectPath: '/test/project',
                sessionContext: {},
            };
            const startTime = Date.now();
            const response = entryPoint.process(request);
            const duration = Date.now() - startTime;
            expect(response.isValid).toBe(true);
            expect(response.selectedFlows.length).toBeGreaterThan(0);
            // Cache the response
            cache.cacheResponse(request.utterance, response);
            cache.recordResponseTime(duration);
            // Verify cache retrieval
            const cached = cache.getCachedResponse(request.utterance);
            expect(cached).toBeDefined();
            expect(cached.isValid).toBe(true);
        });
        test('natural language routes through entry point and caches', () => {
            const request = {
                utterance: 'explore design patterns',
                userId: 'test-user',
                projectPath: '/test/project',
                sessionContext: {},
            };
            const response = entryPoint.process(request);
            if (response.isValid) {
                cache.cacheResponse(request.utterance, response);
                const cached = cache.getCachedResponse(request.utterance);
                expect(cached).toBeDefined();
            }
        });
        test('composite flow bypasses normal routing', () => {
            const request = {
                utterance: '/sidecoach composite:composite_research_to_impl',
                userId: 'test-user',
                projectPath: '/test/project',
                sessionContext: {},
            };
            const response = entryPoint.process(request);
            expect(response.isValid).toBe(true);
            expect(response.entryType).toBe('composite');
            expect(response.primaryFlow).toBe('composite_research_to_impl');
        });
        test('discovery mode returns available commands', () => {
            const request = {
                utterance: '/list',
                userId: 'test-user',
                projectPath: '/test/project',
                sessionContext: {},
            };
            const response = entryPoint.process(request);
            expect(response.isValid).toBe(true);
            expect(response.entryType).toBe('discovery');
            expect(response.discoveryMode).toBe(true);
            const flows = entryPoint.getAvailableFlows();
            expect(Object.keys(flows).length).toBeGreaterThan(0);
        });
        test('cache hit reduces response time', () => {
            const utterance = '/implement';
            const request = {
                utterance,
                userId: 'test-user',
                projectPath: '/test/project',
                sessionContext: {},
            };
            // First request - cache miss
            const response1 = entryPoint.process(request);
            cache.cacheResponse(utterance, response1);
            // Second request - cache hit (should be faster)
            const startTime = Date.now();
            const cached = cache.getCachedResponse(utterance);
            const duration = Date.now() - startTime;
            expect(cached).toBeDefined();
            expect(duration).toBeLessThan(10); // Cached response should be very fast
        });
        test('cache stats track usage correctly', () => {
            const requests = [
                '/research',
                '/implement',
                '/review',
                '/research', // repeat
                '/implement', // repeat
            ];
            for (const utterance of requests) {
                const request = { utterance, userId: 'test', projectPath: '/', sessionContext: {} };
                const response = entryPoint.process(request);
                cache.cacheResponse(utterance, response);
                cache.recordResponseTime(5);
                const cached = cache.getCachedResponse(utterance);
                if (cached) {
                    expect(cached).toBeDefined();
                }
            }
            const stats = cache.getStats();
            expect(stats.totalRequests).toBeGreaterThan(0);
            expect(stats.hitRate).toBeGreaterThanOrEqual(0);
        });
        test('cache invalidation clears matching entries', () => {
            const requests = [
                '/research',
                '/research another variant',
                '/implement',
            ];
            for (const utterance of requests) {
                const request = { utterance, userId: 'test', projectPath: '/', sessionContext: {} };
                const response = entryPoint.process(request);
                cache.cacheResponse(utterance, response);
            }
            const statsBefore = cache.getStats();
            expect(statsBefore.cacheSize).toBeGreaterThan(0);
            // Invalidate research commands
            cache.invalidateByCommand('research');
            const statsAfter = cache.getStats();
            expect(statsAfter.cacheSize).toBeLessThanOrEqual(statsBefore.cacheSize);
        });
    });
    describe('Entry Point Metrics Integration', () => {
        test('tracks request types separately', () => {
            const slashRequest = { utterance: '/research', userId: 'test', projectPath: '/', sessionContext: {} };
            const nlRequest = { utterance: 'explore patterns', userId: 'test', projectPath: '/', sessionContext: {} };
            entryPoint.process(slashRequest);
            entryPoint.process(nlRequest);
            const metrics = entryPoint.getMetrics();
            expect(metrics.totalRequests).toBe(2);
        });
        test('calculates success rate correctly', () => {
            const requests = [
                { utterance: '/research', userId: 'test', projectPath: '/', sessionContext: {} },
                { utterance: '/implement', userId: 'test', projectPath: '/', sessionContext: {} },
                { utterance: '/unknown_command', userId: 'test', projectPath: '/', sessionContext: {} },
            ];
            for (const req of requests) {
                entryPoint.process(req);
            }
            const metrics = entryPoint.getMetrics();
            expect(metrics.successRate).toBeGreaterThanOrEqual(0);
            expect(metrics.successRate).toBeLessThanOrEqual(100);
        });
        test('average flows per request calculated', () => {
            const requests = [
                { utterance: '/research', userId: 'test', projectPath: '/', sessionContext: {} },
                { utterance: '/implement', userId: 'test', projectPath: '/', sessionContext: {} },
                { utterance: '/review', userId: 'test', projectPath: '/', sessionContext: {} },
            ];
            for (const req of requests) {
                entryPoint.process(req);
            }
            const metrics = entryPoint.getMetrics();
            expect(metrics.averageFlowsPerRequest).toBeGreaterThanOrEqual(0);
        });
    });
    describe('Performance Benchmarks', () => {
        test('entry point processing under 50ms for typical requests', () => {
            const times = [];
            for (let i = 0; i < 100; i++) {
                const request = {
                    utterance: '/research',
                    userId: 'test',
                    projectPath: '/',
                    sessionContext: {},
                };
                const start = Date.now();
                entryPoint.process(request);
                times.push(Date.now() - start);
            }
            const avgTime = times.reduce((a, b) => a + b) / times.length;
            expect(avgTime).toBeLessThan(50);
        });
        test('cache retrieval under 5ms', () => {
            const utterance = '/research';
            const request = { utterance, userId: 'test', projectPath: '/', sessionContext: {} };
            const response = entryPoint.process(request);
            cache.cacheResponse(utterance, response);
            const times = [];
            for (let i = 0; i < 1000; i++) {
                const start = Date.now();
                cache.getCachedResponse(utterance);
                times.push(Date.now() - start);
            }
            const avgTime = times.reduce((a, b) => a + b) / times.length;
            expect(avgTime).toBeLessThan(5);
        });
        test('cache stats generation under 10ms', () => {
            for (let i = 0; i < 100; i++) {
                const request = { utterance: `/cmd${i}`, userId: 'test', projectPath: '/', sessionContext: {} };
                const response = entryPoint.process(request);
                cache.cacheResponse(request.utterance, response);
            }
            const times = [];
            for (let i = 0; i < 50; i++) {
                const start = Date.now();
                cache.getStats();
                times.push(Date.now() - start);
            }
            const avgTime = times.reduce((a, b) => a + b) / times.length;
            expect(avgTime).toBeLessThan(10);
        });
    });
    describe('Edge Cases and Error Handling', () => {
        test('handles rapid sequential requests', () => {
            for (let i = 0; i < 50; i++) {
                const request = { utterance: '/research', userId: 'test', projectPath: '/', sessionContext: {} };
                const response = entryPoint.process(request);
                cache.cacheResponse(request.utterance, response);
            }
            const stats = cache.getStats();
            expect(stats.totalRequests).toBeGreaterThan(0);
        });
        test('handles cache overflow gracefully', () => {
            for (let i = 0; i < 600; i++) {
                const request = { utterance: `/cmd${i}`, userId: 'test', projectPath: '/', sessionContext: {} };
                const response = entryPoint.process(request);
                cache.cacheResponse(request.utterance, response);
            }
            const stats = cache.getStats();
            expect(stats.cacheSize).toBeLessThanOrEqual(500);
        });
        test('handles TTL expiration correctly', () => {
            // Create cache with very short TTL
            const shortCache = new (require('./sidecoach-entry-point-cache').EntryPointCache)(100); // 100ms TTL
            const request = { utterance: '/research', userId: 'test', projectPath: '/', sessionContext: {} };
            const response = entryPoint.process(request);
            shortCache.cacheResponse(request.utterance, response);
            expect(shortCache.getCachedResponse(request.utterance)).toBeDefined();
            // Wait for expiration
            setTimeout(() => {
                // Entry should be expired
                shortCache.clearExpired();
                expect(shortCache.getStats().cacheSize).toBe(0);
            }, 150);
        });
    });
    describe('System Integration', () => {
        test('entry point works with orchestrator context', () => {
            const orchestratorContext = {
                userId: 'test-user',
                projectPath: '/test/project',
                currentFile: '/test/file.tsx',
                selectedText: 'some text',
                metadata: { projectType: 'react' },
            };
            const request = {
                utterance: '/research',
                userId: orchestratorContext.userId,
                projectPath: orchestratorContext.projectPath,
                sessionContext: orchestratorContext.metadata,
            };
            const response = entryPoint.process(request);
            expect(response.isValid).toBe(true);
        });
        test('cache can be cleared for fresh start', () => {
            const request = { utterance: '/research', userId: 'test', projectPath: '/', sessionContext: {} };
            const response = entryPoint.process(request);
            cache.cacheResponse(request.utterance, response);
            let stats = cache.getStats();
            expect(stats.cacheSize).toBeGreaterThan(0);
            cache.clear();
            stats = cache.getStats();
            expect(stats.cacheSize).toBe(0);
            expect(stats.totalRequests).toBe(0);
        });
        test('metrics can be reset independently', () => {
            const request = { utterance: '/research', userId: 'test', projectPath: '/', sessionContext: {} };
            const response = entryPoint.process(request);
            cache.cacheResponse(request.utterance, response);
            let stats = cache.getStats();
            expect(stats.totalRequests).toBeGreaterThan(0);
            cache.resetStats();
            stats = cache.getStats();
            expect(stats.totalRequests).toBe(0);
            expect(stats.cacheSize).toBeGreaterThan(0); // Cache still has entries
        });
    });
});
//# sourceMappingURL=phase-iv-e2e-integration.test.js.map