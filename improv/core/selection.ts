import { finder } from '@medv/finder';

/**
 * Returns true if the class name is a dynamic/hashed class that should be
 * excluded from stable CSS selectors.
 */
export function isDynamicClassName(className: string): boolean {
  // CSS Modules: starts with `_` followed by a letter
  if (/^_[a-zA-Z]/.test(className)) return true;

  // styled-components: css- or sc- prefix
  if (className.startsWith('css-') || className.startsWith('sc-')) return true;

  // Generic hashes: 1-3 lowercase letters followed by 8+ purely alphanumeric
  // chars (no hyphens, no underscores - real hashes are alphanumeric only).
  // Must also contain uppercase or digits to distinguish from plain words.
  if (
    /^[a-z]{1,3}[A-Za-z0-9]{8,}$/.test(className) &&
    /[A-Z0-9]/.test(className.slice(1))
  ) {
    return true;
  }

  return false;
}

/**
 * Removes dynamic/hashed class names from an array, keeping semantic and
 * utility classes.
 */
export function filterClasses(classes: string[]): string[] {
  return classes.filter((cls) => !isDynamicClassName(cls));
}

/**
 * Builds a fallback selector by walking up the DOM using tag:nth-of-type(n)
 * chains, stopping at document.body or a maximum number of ancestors.
 */
function buildFallbackSelector(element: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    const tag = current.tagName.toLowerCase();
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (el) => el.tagName === current!.tagName
      );
      const index = siblings.indexOf(current) + 1;
      parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
    } else {
      parts.unshift(tag);
    }
    current = parent as HTMLElement | null;
  }

  return parts.join(' > ') || element.tagName.toLowerCase();
}

/**
 * Generates a stable CSS selector for an element using @medv/finder with
 * dynamic class filtering. Falls back to a tag:nth-of-type chain on failure.
 */
export function generateSelector(element: HTMLElement): string {
  try {
    return finder(element, {
      className: (name) => !isDynamicClassName(name),
    });
  } catch {
    return buildFallbackSelector(element);
  }
}

/**
 * Walks up the DOM up to maxDepth levels and builds a human-readable path
 * like "div#app > section.hero > button.btn-primary".
 */
export function getElementPath(element: HTMLElement, maxDepth = 4): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element;
  let depth = 0;

  while (current && current !== document.body && depth < maxDepth) {
    const tag = current.tagName.toLowerCase();
    const id = current.id ? `#${current.id}` : '';
    const rawClasses = Array.from(current.classList);
    const filteredClasses = filterClasses(rawClasses);
    const classStr = filteredClasses.length > 0 ? `.${filteredClasses.join('.')}` : '';
    parts.unshift(`${tag}${id}${classStr}`);
    current = current.parentElement as HTMLElement | null;
    depth++;
  }

  return parts.join(' > ');
}

const COMPUTED_STYLE_PROPERTIES = [
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius',
  'backgroundColor', 'color', 'opacity',
  'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign',
  'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap', 'flexWrap',
  'gridTemplateColumns', 'gridTemplateRows',
  'width', 'height', 'maxWidth', 'maxHeight', 'minWidth', 'minHeight',
  'position', 'top', 'right', 'bottom', 'left', 'zIndex',
  'boxShadow', 'objectFit', 'objectPosition', 'aspectRatio', 'overflow',
] as const;

const SKIP_VALUES = new Set(['none', 'normal', 'auto', '0px']);

/**
 * Returns a subset of computed styles for the element, skipping values that
 * are "none", "normal", "auto", or "0px" to reduce noise.
 */
export function getComputedStylesSubset(element: HTMLElement): Record<string, string> {
  const computed = getComputedStyle(element);
  const result: Record<string, string> = {};

  for (const prop of COMPUTED_STYLE_PROPERTIES) {
    const value = computed.getPropertyValue(
      prop.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`)
    );
    if (value && !SKIP_VALUES.has(value)) {
      result[prop] = value;
    }
  }

  return result;
}

/**
 * Returns text content of up to 3 parent siblings, each truncated to 80
 * characters, joined with " | ".
 */
export function getNearbyText(element: HTMLElement): string {
  const parent = element.parentElement;
  if (!parent) return '';

  const siblings = Array.from(parent.children).filter((el) => el !== element);
  return siblings
    .slice(0, 3)
    .map((el) => (el.textContent ?? '').trim().slice(0, 80))
    .filter((text) => text.length > 0)
    .join(' | ');
}

/**
 * Reads ARIA and accessibility attributes from an element.
 */
export function getAccessibilityInfo(element: HTMLElement): { role: string; label: string } {
  const role = element.getAttribute('role') ?? element.tagName.toLowerCase();

  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return { role, label: ariaLabel };

  const labelledById = element.getAttribute('aria-labelledby');
  if (labelledById) {
    const labelEl = document.getElementById(labelledById);
    if (labelEl) return { role, label: (labelEl.textContent ?? '').trim() };
  }

  const title = element.getAttribute('title');
  if (title) return { role, label: title };

  const alt = element.getAttribute('alt');
  if (alt) return { role, label: alt };

  return { role, label: '' };
}
