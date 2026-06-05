import type { LayerConfig } from '../../../runtime/types';

/**
 * Server-free stack export. Pure, framework-agnostic helpers that turn the
 * current layer stack into a portable config JSON and hand it to the browser
 * (download or clipboard). No React, no network - the preview IS the export.
 */

export const STACK_CONFIG_FORMAT = 'tilt-lab/stack';
export const STACK_CONFIG_VERSION = 1;
export const STACK_CONFIG_FILENAME = 'tilt-lab-stack.json';

/** The serialized shape of a single layer in an exported stack config. */
export interface ExportedLayer {
  effectId: string;
  layerRole: string;
  params: Record<string, unknown>;
  blendMode: string;
  enabled: boolean;
  opacity: number;
}

/** A complete exported stack: versioned envelope around the ordered layers. */
export interface StackConfig {
  format: typeof STACK_CONFIG_FORMAT;
  version: typeof STACK_CONFIG_VERSION;
  layers: ExportedLayer[];
}

/**
 * Normalize one runtime layer into its exported form. `enabled` and `opacity`
 * are part of the runtime LayerConfig (added alongside per-layer composition);
 * read them defensively so export stays correct whether or not a given layer
 * object carries them yet, defaulting to fully-on / fully-opaque.
 */
function toExportedLayer(layer: LayerConfig): ExportedLayer {
  const l = layer as LayerConfig & { enabled?: boolean; opacity?: number };
  return {
    effectId: l.effectId,
    layerRole: l.layerRole,
    params: { ...l.params },
    blendMode: l.blendMode,
    enabled: l.enabled ?? true,
    opacity: l.opacity ?? 1,
  };
}

/** Build the in-memory config object for a stack (the source of truth for both surfaces). */
export function buildStackConfig(layers: LayerConfig[]): StackConfig {
  return {
    format: STACK_CONFIG_FORMAT,
    version: STACK_CONFIG_VERSION,
    layers: layers.map(toExportedLayer),
  };
}

/** Serialize a stack to pretty-printed config JSON. */
export function serializeStackConfig(layers: LayerConfig[]): string {
  return JSON.stringify(buildStackConfig(layers), null, 2);
}

/**
 * Trigger a browser download of the stack config JSON via a Blob object URL
 * and a transient anchor. The object URL is revoked after the click so we do
 * not leak it.
 */
export function downloadStackConfig(
  layers: LayerConfig[],
  filename: string = STACK_CONFIG_FILENAME,
): void {
  const json = serializeStackConfig(layers);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has a chance to start in browsers
  // that read the URL asynchronously.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Copy the stack config JSON to the clipboard. Resolves when the write completes. */
export function copyStackConfig(layers: LayerConfig[]): Promise<void> {
  return navigator.clipboard.writeText(serializeStackConfig(layers));
}

export const EMBED_SNIPPET_FILENAME = 'tilt-lab-embed.html';

/** Default path the consumer is expected to serve the runtime bundle from. */
export const DEFAULT_RUNTIME_URL = './tilt-runtime.js';

/** Default CSS class on the generated background host element. */
export const DEFAULT_EMBED_CLASS = 'tilt-bg';

export interface EmbedSnippetOptions {
  /** URL the consumer serves `tilt-runtime.js` from. Defaults to {@link DEFAULT_RUNTIME_URL}. */
  runtimeUrl?: string;
  /** CSS class applied to the generated background host. Defaults to {@link DEFAULT_EMBED_CLASS}. */
  className?: string;
}

/**
 * Build a self-contained, paste-anywhere embed snippet for the current stack.
 *
 * Unlike the bare config JSON (which is inert without a host + runtime) or the
 * <tilt-stack config-src> element (which needs the JSON hosted at a fetchable
 * URL), this emits a single HTML block that inlines the config and calls the
 * runtime's `mountStack` - so dropping it behind any element renders the exact
 * previewed stack. The consumer's only job is to serve `tilt-runtime.js`.
 *
 * The host is absolutely positioned to fill its parent (give that parent
 * `position: relative` and render content at z-index >= 1). A classic <script>
 * is used deliberately: `document.currentScript` is null inside ES modules, so
 * the snippet captures the host synchronously in a classic script, then
 * dynamic-imports the runtime to mount.
 */
export function buildEmbedSnippet(layers: LayerConfig[], opts: EmbedSnippetOptions = {}): string {
  const runtimeUrl = opts.runtimeUrl ?? DEFAULT_RUNTIME_URL;
  const className = opts.className ?? DEFAULT_EMBED_CLASS;
  const config = serializeStackConfig(layers);
  return [
    `<!-- tilt-lab embed: self-contained background effect.`,
    `     1. Copy tilt-lab's dist/tilt-runtime.js into your project, served at ${runtimeUrl}`,
    `     2. Paste this block inside the element you want the effect behind. Give that`,
    `        parent position:relative and render your content at z-index 1 or above. -->`,
    `<div class="${className}" style="position:absolute; inset:0; z-index:0; pointer-events:none; overflow:hidden"></div>`,
    `<script>`,
    `  (function () {`,
    `    var host = document.currentScript.previousElementSibling;`,
    `    var config = ${config};`,
    `    import(${JSON.stringify(runtimeUrl)}).then(function (m) { m.mountStack(host, config); });`,
    `  })();`,
    `</script>`,
  ].join('\n');
}

/** Copy the self-contained embed snippet to the clipboard. */
export function copyEmbedSnippet(layers: LayerConfig[], opts: EmbedSnippetOptions = {}): Promise<void> {
  return navigator.clipboard.writeText(buildEmbedSnippet(layers, opts));
}

/** Trigger a browser download of the embed snippet as a standalone .html file. */
export function downloadEmbedSnippet(
  layers: LayerConfig[],
  opts: EmbedSnippetOptions = {},
  filename: string = EMBED_SNIPPET_FILENAME,
): void {
  const html = buildEmbedSnippet(layers, opts);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
