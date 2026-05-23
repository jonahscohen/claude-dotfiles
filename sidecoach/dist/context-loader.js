"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveContextDir = resolveContextDir;
exports.loadContext = loadContext;
exports.detectRegister = detectRegister;
exports.buildProjectContext = buildProjectContext;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const PRODUCT_NAMES = ['PRODUCT.md', 'Product.md', 'product.md'];
const DESIGN_NAMES = ['DESIGN.md', 'Design.md', 'design.md'];
const LEGACY_NAMES = ['.impeccable.md'];
const FALLBACK_DIRS = ['.agents/context', 'docs'];
function firstExisting(dir, names) {
    for (const name of names) {
        const abs = path_1.default.join(dir, name);
        try {
            if (fs_1.default.existsSync(abs))
                return abs;
        }
        catch {
            // Ignore permission errors
        }
    }
    return null;
}
function safeRead(p) {
    try {
        return fs_1.default.readFileSync(p, 'utf-8');
    }
    catch {
        return null;
    }
}
function resolveContextDir(cwd = process.cwd()) {
    // 1. Explicit override via environment
    const envDir = process.env.SIDECOACH_CONTEXT_DIR || process.env.IMPECCABLE_CONTEXT_DIR;
    if (envDir && envDir.trim()) {
        const trimmed = envDir.trim();
        return path_1.default.isAbsolute(trimmed) ? trimmed : path_1.default.resolve(cwd, trimmed);
    }
    // 2. cwd wins if any canonical or legacy file is there
    if (firstExisting(cwd, [...PRODUCT_NAMES, ...DESIGN_NAMES, ...LEGACY_NAMES])) {
        return cwd;
    }
    // 3. Auto-fallback subdirs
    for (const rel of FALLBACK_DIRS) {
        const candidate = path_1.default.resolve(cwd, rel);
        if (firstExisting(candidate, [...PRODUCT_NAMES, ...DESIGN_NAMES])) {
            return candidate;
        }
    }
    // 4. Default to cwd
    return cwd;
}
function loadContext(cwd = process.cwd()) {
    let migrated = false;
    const contextDir = resolveContextDir(cwd);
    // 1. Look for PRODUCT.md (case-insensitive)
    let productPath = firstExisting(contextDir, PRODUCT_NAMES);
    // 2. Legacy: migrate .impeccable.md to PRODUCT.md at cwd root only
    if (!productPath && contextDir === cwd) {
        const legacyPath = firstExisting(cwd, LEGACY_NAMES);
        if (legacyPath) {
            const newPath = path_1.default.join(cwd, 'PRODUCT.md');
            try {
                fs_1.default.renameSync(legacyPath, newPath);
                productPath = newPath;
                migrated = true;
            }
            catch {
                // Rename failed, read legacy in place
                productPath = legacyPath;
            }
        }
    }
    // 3. DESIGN.md (case-insensitive)
    const designPath = firstExisting(contextDir, DESIGN_NAMES);
    const product = productPath ? safeRead(productPath) : null;
    const design = designPath ? safeRead(designPath) : null;
    return {
        hasProduct: !!product,
        product,
        productPath: productPath ? path_1.default.relative(cwd, productPath) : null,
        hasDesign: !!design,
        design,
        designPath: designPath ? path_1.default.relative(cwd, designPath) : null,
        migrated,
        contextDir,
    };
}
function detectRegister(productContent) {
    if (!productContent)
        return null;
    const lower = productContent.toLowerCase();
    // Brand indicators: landing, campaign, marketing, portfolio, identity, brand
    const brandCues = ['landing', 'campaign', 'marketing', 'portfolio', 'identity', 'brand statement', 'brand positioning'];
    const hasBrandCue = brandCues.some(cue => lower.includes(cue));
    // Product indicators: dashboard, app, tool, admin, SaaS, internal, workflow
    const productCues = ['dashboard', ' app ', 'tool', 'admin', 'saas', 'internal', 'workflow', 'interface'];
    const hasProductCue = productCues.some(cue => lower.includes(cue));
    // If both or neither, default to product (conservative choice)
    if (hasBrandCue && !hasProductCue)
        return 'brand';
    if (hasProductCue && !hasBrandCue)
        return 'product';
    return 'product'; // Default fallback
}
function buildProjectContext(cwd = process.cwd()) {
    const loaded = loadContext(cwd);
    const register = detectRegister(loaded.product);
    return {
        cwd,
        contextDir: loaded.contextDir,
        productContent: loaded.product,
        designContent: loaded.design,
        register,
        hasFullContext: loaded.hasProduct && loaded.hasDesign,
    };
}
// Export as CommonJS for CLI usage
if (require.main === module) {
    const result = loadContext(process.cwd());
    console.log(JSON.stringify(result, null, 2));
}
//# sourceMappingURL=context-loader.js.map