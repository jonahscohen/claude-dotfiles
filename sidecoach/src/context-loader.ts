import fs from 'fs';
import path from 'path';

export interface ContextLoadResult {
  hasProduct: boolean;
  product: string | null;
  productPath: string | null;
  hasDesign: boolean;
  design: string | null;
  designPath: string | null;
  migrated: boolean;
  contextDir: string;
}

export interface ProjectContext {
  cwd: string;
  contextDir: string;
  productContent: string | null;
  designContent: string | null;
  register: 'brand' | 'product' | null;
  hasFullContext: boolean;
}

const PRODUCT_NAMES = ['PRODUCT.md', 'Product.md', 'product.md'];
const DESIGN_NAMES = ['DESIGN.md', 'Design.md', 'design.md'];
const LEGACY_NAMES = ['.impeccable.md'];
const FALLBACK_DIRS = ['.agents/context', 'docs'];

function firstExisting(dir: string, names: string[]): string | null {
  for (const name of names) {
    const abs = path.join(dir, name);
    try {
      if (fs.existsSync(abs)) return abs;
    } catch {
      // Ignore permission errors
    }
  }
  return null;
}

function safeRead(p: string): string | null {
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return null;
  }
}

export function resolveContextDir(cwd: string = process.cwd()): string {
  // 1. Explicit override via environment
  const envDir = process.env.SIDECOACH_CONTEXT_DIR || process.env.IMPECCABLE_CONTEXT_DIR;
  if (envDir && envDir.trim()) {
    const trimmed = envDir.trim();
    return path.isAbsolute(trimmed) ? trimmed : path.resolve(cwd, trimmed);
  }

  // 2. cwd wins if any canonical or legacy file is there
  if (firstExisting(cwd, [...PRODUCT_NAMES, ...DESIGN_NAMES, ...LEGACY_NAMES])) {
    return cwd;
  }

  // 3. Auto-fallback subdirs
  for (const rel of FALLBACK_DIRS) {
    const candidate = path.resolve(cwd, rel);
    if (firstExisting(candidate, [...PRODUCT_NAMES, ...DESIGN_NAMES])) {
      return candidate;
    }
  }

  // 4. Default to cwd
  return cwd;
}

export function loadContext(cwd: string = process.cwd()): ContextLoadResult {
  let migrated = false;
  const contextDir = resolveContextDir(cwd);

  // 1. Look for PRODUCT.md (case-insensitive)
  let productPath = firstExisting(contextDir, PRODUCT_NAMES);

  // 2. Legacy: migrate .impeccable.md to PRODUCT.md at cwd root only
  if (!productPath && contextDir === cwd) {
    const legacyPath = firstExisting(cwd, LEGACY_NAMES);
    if (legacyPath) {
      const newPath = path.join(cwd, 'PRODUCT.md');
      try {
        fs.renameSync(legacyPath, newPath);
        productPath = newPath;
        migrated = true;
      } catch {
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
    productPath: productPath ? path.relative(cwd, productPath) : null,
    hasDesign: !!design,
    design,
    designPath: designPath ? path.relative(cwd, designPath) : null,
    migrated,
    contextDir,
  };
}

export function detectRegister(productContent: string | null): 'brand' | 'product' | null {
  if (!productContent) return null;

  const lower = productContent.toLowerCase();

  // Brand indicators: landing, campaign, marketing, portfolio, identity, brand
  const brandCues = ['landing', 'campaign', 'marketing', 'portfolio', 'identity', 'brand statement', 'brand positioning'];
  const hasBrandCue = brandCues.some(cue => lower.includes(cue));

  // Product indicators: dashboard, app, tool, admin, SaaS, internal, workflow
  const productCues = ['dashboard', ' app ', 'tool', 'admin', 'saas', 'internal', 'workflow', 'interface'];
  const hasProductCue = productCues.some(cue => lower.includes(cue));

  // If both or neither, default to product (conservative choice)
  if (hasBrandCue && !hasProductCue) return 'brand';
  if (hasProductCue && !hasBrandCue) return 'product';

  return 'product'; // Default fallback
}

export function buildProjectContext(cwd: string = process.cwd()): ProjectContext {
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
