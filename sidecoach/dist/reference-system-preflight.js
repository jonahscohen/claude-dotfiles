"use strict";
// Reference System Pre-Flight & Graceful Fallback
// Task #22: Unified health check + fallback routing for all 4 reference systems
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferenceSystemPreFlight = void 0;
exports.createReferenceSystemPreFlight = createReferenceSystemPreFlight;
const reference_data_1 = require("./reference-data");
class ReferenceSystemPreFlight {
    constructor(factory) {
        this.healthCache = new Map();
        this.HEALTH_CHECK_INTERVAL_MS = 300000; // 5 minutes
        this.TIMEOUT_MS = 5000; // 5 second timeout for live checks
        this.factory = factory;
        this.dataService = new reference_data_1.ReferenceDataService();
    }
    /**
     * Run pre-flight checks on all reference systems
     * Returns immediate status without blocking on slow systems
     */
    async runPreFlight() {
        const systemNames = ['component-gallery', 'fontshare', 'design-references', 'motion-patterns'];
        const systems = [];
        const warnings = [];
        // Run health checks in parallel with timeout
        const checks = systemNames.map((name) => this.checkSystemHealth(name));
        const results = await Promise.allSettled(checks);
        results.forEach((result, i) => {
            if (result.status === 'fulfilled') {
                systems.push(result.value);
            }
            else {
                systems.push({
                    systemName: systemNames[i],
                    isAvailable: false,
                    reason: 'Health check timed out or errored',
                    fallbackActive: true,
                    lastCheckMs: Date.now(),
                });
                warnings.push(`⚠️  ${systemNames[i]} health check failed, using fallback`);
            }
        });
        const allHealthy = systems.every((s) => s.isAvailable);
        return {
            allHealthy,
            systems,
            warnings: allHealthy ? [] : warnings,
        };
    }
    /**
     * Check health of a single reference system with caching
     */
    async checkSystemHealth(systemName) {
        // Check cache first
        const cached = this.healthCache.get(systemName);
        if (cached && Date.now() - cached.timestamp < this.HEALTH_CHECK_INTERVAL_MS) {
            return cached.health;
        }
        // Run actual health check
        let health;
        try {
            const startTime = Date.now();
            switch (systemName) {
                case 'component-gallery':
                    health = await this.checkComponentGalleryHealth();
                    break;
                case 'fontshare':
                    health = await this.checkFontshareHealth();
                    break;
                case 'design-references':
                    health = await this.checkDesignReferencesHealth();
                    break;
                case 'motion-patterns':
                    health = await this.checkMotionPatternsHealth();
                    break;
                default:
                    health = {
                        systemName,
                        isAvailable: false,
                        reason: 'Unknown system',
                        fallbackActive: true,
                        lastCheckMs: Date.now(),
                    };
            }
            health.lastCheckMs = Date.now() - startTime;
            // Cache the result
            this.healthCache.set(systemName, { timestamp: Date.now(), health });
            return health;
        }
        catch (err) {
            const health = {
                systemName,
                isAvailable: false,
                reason: String(err).substring(0, 100),
                fallbackActive: true,
                lastCheckMs: Date.now(),
            };
            this.healthCache.set(systemName, { timestamp: Date.now(), health });
            return health;
        }
    }
    /**
     * Get reference system with automatic fallback
     * Returns production system or cached fallback depending on health
     */
    async getComponentGalleryWithFallback() {
        const health = await this.checkSystemHealth('component-gallery');
        if (health.isAvailable) {
            return await this.factory.createComponentGallery();
        }
        // Fallback: return stub from data service
        return {
            getComponentPatterns: async (componentType, register) => {
                return this.dataService.searchComponents(componentType).slice(0, 3).map((c) => ({
                    name: c.name,
                    description: c.description,
                    semanticMarkup: `<${componentType.toLowerCase()} role="region"></${componentType.toLowerCase()}>`,
                    ariaRequirements: ['aria-label', 'role', 'tabindex'],
                    keyboardInteraction: 'Tab to focus, Enter/Space to activate',
                    states: c.variants || ['default', 'hover', 'focus', 'active', 'disabled'],
                    wcagRules: ['WCAG 2.1 AA: Contrast', 'WCAG 2.1 AA: Keyboard', 'WCAG 2.1 AA: Structure'],
                }));
            },
            getSemanticMarkup: async (componentType) => {
                return `<${componentType.toLowerCase()} role="region"></${componentType.toLowerCase()}>`;
            },
            getA11yPatterns: async (componentType) => ['aria-label', 'role', 'tabindex'],
            getInteractionStates: async (componentType) => [
                'default',
                'hover',
                'focus',
                'active',
                'disabled',
                'loading',
                'error',
                'success',
            ],
            validateAgainstWcag: async (componentType) => [
                'WCAG 2.1 AA: 4.5:1 contrast on text',
                'WCAG 2.1 AA: Focus rings visible',
                'WCAG 2.1 AA: 44x44px touch targets',
            ],
        };
    }
    async getFontshareWithFallback() {
        const health = await this.checkSystemHealth('fontshare');
        if (health.isAvailable) {
            return await this.factory.createFontshare();
        }
        // Fallback: return cached data
        return {
            getFontCandidates: async (typography, register) => {
                return [
                    {
                        name: 'Inter',
                        family: 'Inter, sans-serif',
                        weights: [400, 500, 600, 700],
                        category: 'sans-serif',
                        pairingStrategy: 'Classic sans+serif pairing',
                        opentypeFeatures: ['kern', 'liga', 'tabular-nums'],
                        fallback: 'system-ui, sans-serif',
                    },
                    {
                        name: 'Playfair Display',
                        family: 'Playfair Display, serif',
                        weights: [400, 700],
                        category: 'serif',
                        pairingStrategy: 'Display heading',
                        opentypeFeatures: ['kern', 'liga', 'swsh'],
                        fallback: 'Georgia, serif',
                    },
                ];
            },
            getPairingRules: async (brandPersonality) => [
                'Pair serif heading with sans-serif body',
                'Stick to 1-2 font families max',
                'Ensure 1.25+ size ratio between hierarchy levels',
                'Test on actual devices with bandwidth limitations',
            ],
            getOpenTypeFeatures: async (fontName) => [
                'kern',
                'liga',
                'dlig',
                'ss01',
                'tabular-nums',
            ],
            validateFontMetrics: async (fontName) => ({
                lineHeight: 1.5,
                descent: -0.2,
                ascent: 0.8,
            }),
        };
    }
    async getDesignReferencesWithFallback() {
        const health = await this.checkSystemHealth('design-references');
        if (health.isAvailable) {
            return await this.factory.createDesignReferences();
        }
        // Fallback: return cached reference data
        return {
            searchReferences: async (query, register, limit) => {
                // Return empty array for fallback (cached data would populate this)
                return [];
            },
            getPatternsByCategory: async (category, register) => {
                // Return empty array - no cached data available
                return [];
            },
            getCategoryReflex: async (category) => {
                // Return empty list (no category reflex data available in fallback)
                return [];
            },
            addReference: async (reference) => {
                // Fallback: silently skip (would queue for sync in Phase 2)
            },
        };
    }
    async getMotionReferenceWithFallback() {
        const health = await this.checkSystemHealth('motion-patterns');
        if (health.isAvailable) {
            return await this.factory.createMotionReference();
        }
        // Fallback: return safe motion defaults
        return {
            getEasingCurves: async (intensity) => {
                return [
                    {
                        name: 'ease-out-quad',
                        description: 'Standard entrance easing',
                        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        duration: 300,
                        useCase: 'entrance',
                        staggerBase: 50,
                        reducedMotionFallback: 'instant',
                    },
                ];
            },
            getMotionPalette: async (register) => {
                return [
                    {
                        name: 'fade-in',
                        description: 'Opacity fade entrance',
                        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        duration: 300,
                        useCase: 'entrance',
                        reducedMotionFallback: 'instant',
                    },
                ];
            },
            validateMotionLaws: async (code) => {
                const violations = [];
                if (/bounce|elastic/.test(code)) {
                    violations.push('Motion anti-pattern: bounce/elastic easing detected');
                }
                return violations;
            },
            getReducedMotionAlternative: async (pattern) => ({
                ...pattern,
                easing: 'none',
                duration: 0,
                reducedMotionFallback: 'instant',
            }),
        };
    }
    // Private health check methods
    async checkComponentGalleryHealth() {
        try {
            const ref = await this.factory.createComponentGallery();
            const patterns = await Promise.race([
                ref.getComponentPatterns('button', 'product'),
                new Promise((_, reject) => setTimeout(() => reject('timeout'), this.TIMEOUT_MS)),
            ]);
            const isHealthy = Array.isArray(patterns) && patterns.length >= 0;
            return {
                systemName: 'component-gallery',
                isAvailable: isHealthy,
                reason: isHealthy ? undefined : 'Returned invalid data',
                fallbackActive: !isHealthy,
                lastCheckMs: Date.now(),
            };
        }
        catch (err) {
            return {
                systemName: 'component-gallery',
                isAvailable: false,
                reason: String(err).substring(0, 100),
                fallbackActive: true,
                lastCheckMs: Date.now(),
            };
        }
    }
    async checkFontshareHealth() {
        try {
            const ref = await this.factory.createFontshare();
            const candidates = await Promise.race([
                ref.getFontCandidates('serif', 'brand'),
                new Promise((_, reject) => setTimeout(() => reject('timeout'), this.TIMEOUT_MS)),
            ]);
            const isHealthy = Array.isArray(candidates);
            return {
                systemName: 'fontshare',
                isAvailable: isHealthy,
                reason: isHealthy ? undefined : 'Returned invalid data',
                fallbackActive: !isHealthy,
                lastCheckMs: Date.now(),
            };
        }
        catch (err) {
            return {
                systemName: 'fontshare',
                isAvailable: false,
                reason: String(err).substring(0, 100),
                fallbackActive: true,
                lastCheckMs: Date.now(),
            };
        }
    }
    async checkDesignReferencesHealth() {
        try {
            const ref = await this.factory.createDesignReferences();
            const refs = await Promise.race([
                ref.searchReferences('button', 'product', 1),
                new Promise((_, reject) => setTimeout(() => reject('timeout'), this.TIMEOUT_MS)),
            ]);
            const isHealthy = Array.isArray(refs);
            return {
                systemName: 'design-references',
                isAvailable: isHealthy,
                reason: isHealthy ? undefined : 'Returned invalid data',
                fallbackActive: !isHealthy,
                lastCheckMs: Date.now(),
            };
        }
        catch (err) {
            return {
                systemName: 'design-references',
                isAvailable: false,
                reason: String(err).substring(0, 100),
                fallbackActive: true,
                lastCheckMs: Date.now(),
            };
        }
    }
    async checkMotionPatternsHealth() {
        try {
            const ref = await this.factory.createMotionReference();
            const patterns = await Promise.race([
                ref.getEasingCurves('restrained'),
                new Promise((_, reject) => setTimeout(() => reject('timeout'), this.TIMEOUT_MS)),
            ]);
            const isHealthy = Array.isArray(patterns);
            return {
                systemName: 'motion-patterns',
                isAvailable: isHealthy,
                reason: isHealthy ? undefined : 'Returned invalid data',
                fallbackActive: !isHealthy,
                lastCheckMs: Date.now(),
            };
        }
        catch (err) {
            return {
                systemName: 'motion-patterns',
                isAvailable: false,
                reason: String(err).substring(0, 100),
                fallbackActive: true,
                lastCheckMs: Date.now(),
            };
        }
    }
    clearCache() {
        this.healthCache.clear();
    }
}
exports.ReferenceSystemPreFlight = ReferenceSystemPreFlight;
function createReferenceSystemPreFlight(factory) {
    return new ReferenceSystemPreFlight(factory);
}
//# sourceMappingURL=reference-system-preflight.js.map