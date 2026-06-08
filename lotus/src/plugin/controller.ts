// ─── Lotus Plugin Controller ──────────────────────────────────────────
// Static imports — standard Figma plugin approach

import { readSelection, readNodeTree, serializeNode } from './nodes/reader';
import { createNodeFromSpec, batchCreateNodes } from './nodes/creator';
import { modifyNode } from './nodes/modifier';
import { findNodesByName, findNodesByType, walkTree } from './nodes/traversal';
import { extractDesignSystem } from './styles/extractor';
import { applyStyleTransfer } from './styles/applicator';
import { generateComponentSet } from './components/generator';
import { runAccessibilityAudit } from './accessibility/auditor';
import { exportCode } from './codegen/react';
import { exportVue } from './codegen/vue';
import { exportSvelte } from './codegen/svelte';
import { exportHtmlTailwind } from './codegen/html-tailwind';

// ─── Show UI ────────────────────────────────────────────────────────────────

figma.showUI(__html__, { width: 420, height: 640, themeColors: true, title: 'Lotus' });

// ─── Messaging helpers ──────────────────────────────────────────────────────

interface PluginMsg { type: string; [key: string]: any; }

function postToUI(msg: PluginMsg) {
  figma.ui.postMessage(msg);
}

function respond(requestId: string, success: boolean, data?: unknown, error?: string) {
  postToUI({ type: 'response', requestId, success, data, error });
}

postToUI({ type: 'plugin-ready' });

// ─── Selection change ───────────────────────────────────────────────────────

figma.on('selectionchange', () => {
  postToUI({ type: 'selection-changed', selection: readSelection() });
});

// ─── Helper: resolve node by ID with error response ─────────────────────────

function resolveNode(msg: PluginMsg, field = 'nodeId'): SceneNode | null {
  const node = figma.getNodeById(msg[field]);
  if (!node) {
    respond(msg.requestId, false, undefined, `Node not found: ${msg[field]}`);
    return null;
  }
  return node as SceneNode;
}

// ─── Message router ─────────────────────────────────────────────────────────

figma.ui.onmessage = async (msg: PluginMsg) => {
  try {
    switch (msg.type) {

      // ── READ & INSPECT ────────────────────────────────────────────────
      case 'get-selection': {
        respond(msg.requestId, true, readSelection());
        break;
      }
      case 'get-current-user': {
        respond(msg.requestId, true, {
          id: figma.currentUser?.id ?? null,
          name: figma.currentUser?.name ?? null,
        });
        break;
      }
      case 'get-design-system': {
        const ds = await extractDesignSystem();
        respond(msg.requestId, true, ds);
        break;
      }
      case 'get-page-context': {
        const nodes = readNodeTree(figma.currentPage, msg.depth ?? 3);
        respond(msg.requestId, true, nodes);
        break;
      }
      case 'read-node-properties': {
        const node = resolveNode(msg);
        if (!node) break;
        const serialized = serializeNode(node, msg.depth ?? 2);
        respond(msg.requestId, true, serialized);
        break;
      }
      case 'find-nodes': {
        let root: SceneNode | BaseNode = figma.currentPage as any;
        if (msg.parentId) {
          const parentNode = figma.getNodeById(msg.parentId);
          if (parentNode) root = parentNode;
        }

        let results: SceneNode[] = [];

        if (msg.name && msg.nodeType) {
          // Both name and type filter
          const nameMatches = 'children' in root
            ? findNodesByName(root as SceneNode, msg.name)
            : [];
          results = nameMatches.filter(n => n.type === msg.nodeType);
        } else if (msg.name) {
          results = 'children' in root
            ? findNodesByName(root as SceneNode, msg.name)
            : [];
        } else if (msg.nodeType) {
          results = 'children' in root
            ? findNodesByType(root as SceneNode, msg.nodeType)
            : [];
        } else {
          // No filter: return direct children
          if ('children' in root) {
            results = (root as FrameNode).children.map(c => c as SceneNode);
          }
        }

        // Cap at 100 to avoid huge responses
        const capped = results.slice(0, 100);
        const serialized = capped.map(n => serializeNode(n, 0));
        respond(msg.requestId, true, serialized);
        break;
      }
      case 'set-selection': {
        const nodes = (msg.nodeIds as string[])
          .map(id => figma.getNodeById(id))
          .filter((n): n is SceneNode => n !== null && 'type' in n);
        figma.currentPage.selection = nodes;
        if (msg.zoomToFit !== false && nodes.length > 0) {
          figma.viewport.scrollAndZoomIntoView(nodes);
        }
        respond(msg.requestId, true, { selected: nodes.length });
        break;
      }
      case 'list-fonts': {
        const fonts = await figma.listAvailableFontsAsync();
        let filtered = fonts;
        if (msg.search) {
          const q = (msg.search as string).toLowerCase();
          filtered = fonts.filter(f => f.fontName.family.toLowerCase().includes(q));
        }
        const limit = msg.limit ?? 50;
        const result = filtered.slice(0, limit).map(f => ({
          family: f.fontName.family,
          style: f.fontName.style,
        }));
        respond(msg.requestId, true, result);
        break;
      }

      // ── CREATE & LAYOUT ───────────────────────────────────────────────
      case 'create-node': {
        let parent: FrameNode | GroupNode | ComponentNode | undefined;
        if (msg.node.parentId) {
          const resolved = figma.getNodeById(msg.node.parentId);
          if (resolved && 'children' in resolved) {
            parent = resolved as FrameNode | GroupNode | ComponentNode;
          }
        }
        const created = await createNodeFromSpec(msg.node, parent);
        if (created) {
          if (!msg.node.parentId) {
            figma.viewport.scrollAndZoomIntoView([created]);
          }
          respond(msg.requestId, true, { id: created.id, name: created.name });
        } else {
          respond(msg.requestId, false, undefined, 'Failed to create node');
        }
        break;
      }
      case 'zoom-to-node': {
        const node = figma.getNodeById(msg.nodeId);
        if (node) figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
        respond(msg.requestId, true);
        break;
      }
      case 'batch-create-nodes': {
        const parent = msg.parentId ? figma.getNodeById(msg.parentId) : null;
        const created = await batchCreateNodes(msg.nodes, (parent ?? undefined) as any);
        const ids = created.map((n: any) => ({ id: n.id, name: n.name }));
        if (created.length > 0) figma.viewport.scrollAndZoomIntoView(created);
        respond(msg.requestId, true, ids);
        break;
      }
      case 'create-line': {
        const line = figma.createLine();
        line.name = msg.name ?? 'Line';
        line.resize(msg.length ?? 100, 0);
        if (msg.strokeColor) {
          line.strokes = [{
            type: 'SOLID',
            color: { r: msg.strokeColor.r, g: msg.strokeColor.g, b: msg.strokeColor.b },
          }];
        }
        line.strokeWeight = msg.strokeWeight ?? 1;
        if (msg.opacity !== undefined) line.opacity = msg.opacity;

        if (msg.parentId) {
          const parent = figma.getNodeById(msg.parentId);
          if (parent && 'children' in parent) {
            (parent as FrameNode).appendChild(line);
          }
        } else {
          figma.currentPage.appendChild(line);
          if (msg.x !== undefined) line.x = msg.x;
          else {
            const center = figma.viewport.center;
            line.x = center.x - line.width / 2;
            line.y = center.y;
          }
        }
        if (msg.x !== undefined) line.x = msg.x;
        if (msg.y !== undefined) line.y = msg.y;

        respond(msg.requestId, true, { id: line.id, name: line.name });
        break;
      }
      case 'create-svg-node': {
        const svgNode = figma.createNodeFromSvg(msg.svg);
        svgNode.name = msg.name ?? 'SVG';
        if (msg.width || msg.height) {
          const targetW = msg.width ?? svgNode.width;
          const targetH = msg.height ?? svgNode.height;
          svgNode.resize(targetW, targetH);
        }

        if (msg.parentId) {
          const parent = figma.getNodeById(msg.parentId);
          if (parent && 'children' in parent) {
            (parent as FrameNode).appendChild(svgNode);
          }
        } else {
          const center = figma.viewport.center;
          svgNode.x = (msg.x !== undefined) ? msg.x : center.x - svgNode.width / 2;
          svgNode.y = (msg.y !== undefined) ? msg.y : center.y - svgNode.height / 2;
        }
        if (msg.x !== undefined) svgNode.x = msg.x;
        if (msg.y !== undefined) svgNode.y = msg.y;

        respond(msg.requestId, true, { id: svgNode.id, name: svgNode.name });
        break;
      }
      case 'move-to-parent': {
        const node = resolveNode(msg);
        if (!node) break;
        const parent = figma.getNodeById(msg.parentId);
        if (!parent || !('children' in parent)) {
          respond(msg.requestId, false, undefined, 'Parent not found or not a container');
          break;
        }
        const container = parent as FrameNode;
        if (msg.index !== undefined) {
          container.insertChild(msg.index, node);
        } else {
          container.appendChild(node);
        }
        respond(msg.requestId, true, { id: node.id, parent: container.id });
        break;
      }

      // ── MODIFY & STYLE ────────────────────────────────────────────────
      case 'modify-node': {
        const node = resolveNode(msg);
        if (!node) break;
        await modifyNode(node, msg.properties);
        respond(msg.requestId, true, { id: node.id });
        break;
      }
      case 'delete-node': {
        const node = resolveNode(msg);
        if (!node) break;
        node.remove();
        respond(msg.requestId, true);
        break;
      }
      case 'set-fill': {
        const node = resolveNode(msg);
        if (!node || !('fills' in node)) {
          if (node) respond(msg.requestId, false, undefined, 'Node does not support fills');
          break;
        }
        const fills = msg.fills as any[];
        const figmaFills: Paint[] = fills.map((f: any) => {
          if (f.type === 'SOLID') {
            return {
              type: 'SOLID',
              color: { r: f.color.r, g: f.color.g, b: f.color.b },
              opacity: f.opacity ?? 1,
              visible: true,
            } as SolidPaint;
          }
          // Gradient fills
          if (f.type?.startsWith('GRADIENT_') && f.gradientStops) {
            return {
              type: f.type,
              gradientStops: f.gradientStops.map((s: any) => ({
                position: s.position,
                color: { r: s.color.r, g: s.color.g, b: s.color.b, a: s.color.a ?? 1 },
              })),
              gradientTransform: [[1, 0, 0], [0, 1, 0]],
              opacity: f.opacity ?? 1,
              visible: true,
            } as GradientPaint;
          }
          return { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true } as SolidPaint;
        });
        (node as GeometryMixin).fills = figmaFills;
        respond(msg.requestId, true, { id: node.id });
        break;
      }
      case 'set-stroke': {
        const node = resolveNode(msg);
        if (!node || !('strokes' in node)) {
          if (node) respond(msg.requestId, false, undefined, 'Node does not support strokes');
          break;
        }
        const geo = node as GeometryMixin;
        if (msg.remove) {
          geo.strokes = [];
        } else if (msg.color) {
          geo.strokes = [{
            type: 'SOLID',
            color: { r: msg.color.r, g: msg.color.g, b: msg.color.b },
            opacity: msg.opacity ?? 1,
            visible: true,
          }];
        }
        if (msg.weight !== undefined) geo.strokeWeight = msg.weight;
        if (msg.align !== undefined && 'strokeAlign' in node) {
          (node as RectangleNode).strokeAlign = msg.align;
        }
        respond(msg.requestId, true, { id: node.id });
        break;
      }
      case 'set-effects': {
        const node = resolveNode(msg);
        if (!node || !('effects' in node)) {
          if (node) respond(msg.requestId, false, undefined, 'Node does not support effects');
          break;
        }
        const effects = msg.effects as any[];
        (node as FrameNode).effects = effects.map((e: any) => {
          if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
            return {
              type: e.type,
              color: e.color ? { r: e.color.r, g: e.color.g, b: e.color.b, a: e.color.a ?? 0.25 } : { r: 0, g: 0, b: 0, a: 0.25 },
              offset: e.offset ?? { x: 0, y: 4 },
              radius: e.radius ?? 4,
              spread: e.spread ?? 0,
              visible: true,
              blendMode: 'NORMAL' as BlendMode,
            } as DropShadowEffect;
          }
          return {
            type: e.type,
            radius: e.radius ?? 4,
            visible: true,
          } as BlurEffect;
        });
        respond(msg.requestId, true, { id: node.id });
        break;
      }

      // ── COMPONENTS & INSTANCES ────────────────────────────────────────
      case 'create-component-instance': {
        const comp = figma.getNodeById(msg.componentId);
        if (!comp || comp.type !== 'COMPONENT') {
          respond(msg.requestId, false, undefined, 'Component not found');
          break;
        }
        const instance = (comp as ComponentNode).createInstance();
        if (msg.parentId) {
          const parent = figma.getNodeById(msg.parentId);
          if (parent && 'children' in parent) {
            (parent as FrameNode).appendChild(instance);
          }
        }
        if (msg.x !== undefined) instance.x = msg.x;
        if (msg.y !== undefined) instance.y = msg.y;
        respond(msg.requestId, true, { id: instance.id, name: instance.name });
        break;
      }
      case 'detach-instance': {
        const node = resolveNode(msg);
        if (!node) break;
        if (node.type !== 'INSTANCE') {
          respond(msg.requestId, false, undefined, 'Node is not a component instance');
          break;
        }
        const detached = (node as InstanceNode).detachInstance();
        respond(msg.requestId, true, { id: detached.id, name: detached.name });
        break;
      }

      // ── VECTOR OPERATIONS ─────────────────────────────────────────────
      case 'boolean-operation': {
        const nodeIds = msg.nodeIds as string[];
        const nodes = nodeIds
          .map(id => figma.getNodeById(id))
          .filter((n): n is SceneNode => n !== null && 'type' in n);
        if (nodes.length < 2) {
          respond(msg.requestId, false, undefined, 'Need at least 2 nodes for boolean operation');
          break;
        }
        const opMap: Record<string, 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'> = {
          UNION: 'UNION', SUBTRACT: 'SUBTRACT', INTERSECT: 'INTERSECT', EXCLUDE: 'EXCLUDE',
        };
        const op = opMap[msg.operation] ?? 'UNION';
        const boolGroup = figma.union(nodes, figma.currentPage);
        // figma.union creates a UNION, but we might need a different op
        if (op !== 'UNION') {
          // Re-create with correct operation
          boolGroup.remove();
          let result: BooleanOperationNode;
          switch (op) {
            case 'SUBTRACT': result = figma.subtract(nodes, figma.currentPage); break;
            case 'INTERSECT': result = figma.intersect(nodes, figma.currentPage); break;
            case 'EXCLUDE': result = figma.exclude(nodes, figma.currentPage); break;
            default: result = figma.union(nodes, figma.currentPage); break;
          }
          if (msg.name) result.name = msg.name;
          respond(msg.requestId, true, { id: result.id, name: result.name });
        } else {
          if (msg.name) boolGroup.name = msg.name;
          respond(msg.requestId, true, { id: boolGroup.id, name: boolGroup.name });
        }
        break;
      }
      case 'flatten-nodes': {
        const nodeIds = msg.nodeIds as string[];
        const nodes = nodeIds
          .map(id => figma.getNodeById(id))
          .filter((n): n is SceneNode => n !== null && 'type' in n);
        if (nodes.length === 0) {
          respond(msg.requestId, false, undefined, 'No valid nodes to flatten');
          break;
        }
        const flattened = figma.flatten(nodes, figma.currentPage);
        respond(msg.requestId, true, { id: flattened.id, name: flattened.name });
        break;
      }

      // ── TYPOGRAPHY ────────────────────────────────────────────────────
      case 'style-text-range': {
        const node = resolveNode(msg);
        if (!node || node.type !== 'TEXT') {
          if (node) respond(msg.requestId, false, undefined, 'Node is not a text node');
          break;
        }
        const textNode = node as TextNode;
        const start = msg.start as number;
        const end = msg.end as number;

        // Load font for the range first
        const family = msg.fontFamily ?? 'Inter';
        const style = msg.fontStyle ?? 'Regular';
        if (msg.fontFamily || msg.fontStyle) {
          await figma.loadFontAsync({ family, style });
          textNode.setRangeFontName(start, end, { family, style });
        }
        if (msg.fontSize !== undefined) {
          textNode.setRangeFontSize(start, end, msg.fontSize);
        }
        if (msg.color) {
          textNode.setRangeFills(start, end, [{
            type: 'SOLID',
            color: { r: msg.color.r, g: msg.color.g, b: msg.color.b },
          }]);
        }
        if (msg.letterSpacing !== undefined) {
          textNode.setRangeLetterSpacing(start, end, { unit: 'PIXELS', value: msg.letterSpacing });
        }
        if (msg.lineHeight !== undefined) {
          textNode.setRangeLineHeight(start, end, { unit: 'PIXELS', value: msg.lineHeight });
        }
        if (msg.textDecoration) {
          textNode.setRangeTextDecoration(start, end, msg.textDecoration as TextDecoration);
        }
        if (msg.textCase) {
          textNode.setRangeTextCase(start, end, msg.textCase as TextCase);
        }
        respond(msg.requestId, true, { id: node.id });
        break;
      }

      // ── CONSTRAINTS ───────────────────────────────────────────────────
      case 'set-constraints': {
        const node = resolveNode(msg);
        if (!node) break;
        if (!('constraints' in node)) {
          respond(msg.requestId, false, undefined, 'Node does not support constraints');
          break;
        }
        const constrainable = node as ConstraintMixin;
        const current = constrainable.constraints;
        constrainable.constraints = {
          horizontal: (msg.horizontal as ConstraintType) ?? current.horizontal,
          vertical: (msg.vertical as ConstraintType) ?? current.vertical,
        };
        respond(msg.requestId, true, { id: node.id });
        break;
      }

      // ── VARIABLES & TOKENS ────────────────────────────────────────────
      case 'get-variables': {
        try {
          const collections = await figma.variables.getLocalVariableCollectionsAsync();
          const result = [];
          for (const col of collections) {
            const vars = await Promise.all(
              col.variableIds.map(id => figma.variables.getVariableByIdAsync(id))
            );
            result.push({
              id: col.id,
              name: col.name,
              modes: col.modes.map(m => ({ modeId: m.modeId, name: m.name })),
              variables: vars
                .filter((v): v is Variable => v !== null)
                .map(v => ({
                  id: v.id,
                  name: v.name,
                  resolvedType: v.resolvedType,
                  valuesByMode: Object.fromEntries(
                    Object.entries(v.valuesByMode).map(([modeId, value]) => {
                      if (typeof value === 'object' && value !== null && 'r' in value) {
                        const c = value as RGBA;
                        return [modeId, { r: c.r, g: c.g, b: c.b, a: c.a }];
                      }
                      return [modeId, value];
                    })
                  ),
                })),
            });
          }
          respond(msg.requestId, true, result);
        } catch {
          respond(msg.requestId, true, []);
        }
        break;
      }
      case 'create-variable-collection': {
        const collection = figma.variables.createVariableCollection(msg.name);
        // Rename first mode and add additional modes
        if (msg.modes && Array.isArray(msg.modes) && msg.modes.length > 0) {
          // Rename the auto-created first mode
          collection.renameMode(collection.modes[0].modeId, msg.modes[0]);
          // Add additional modes
          for (let i = 1; i < msg.modes.length; i++) {
            collection.addMode(msg.modes[i]);
          }
        }
        respond(msg.requestId, true, {
          id: collection.id,
          name: collection.name,
          modes: collection.modes.map(m => ({ modeId: m.modeId, name: m.name })),
        });
        break;
      }
      case 'create-variable': {
        const typeMap: Record<string, VariableResolvedDataType> = {
          COLOR: 'COLOR', FLOAT: 'FLOAT', STRING: 'STRING', BOOLEAN: 'BOOLEAN',
        };
        const resolvedType = typeMap[msg.variableType] ?? 'COLOR';
        const variable = figma.variables.createVariable(msg.name, msg.collectionId, resolvedType);

        // Set values per mode
        if (msg.values && typeof msg.values === 'object') {
          const collection = await figma.variables.getVariableCollectionByIdAsync(msg.collectionId);
          if (collection) {
            for (const [key, value] of Object.entries(msg.values)) {
              // Key can be mode ID or mode name
              let modeId = key;
              const modeByName = collection.modes.find(m => m.name === key);
              if (modeByName) modeId = modeByName.modeId;

              if (resolvedType === 'COLOR' && typeof value === 'object' && value !== null) {
                const c = value as { r: number; g: number; b: number; a?: number };
                variable.setValueForMode(modeId, { r: c.r, g: c.g, b: c.b, a: c.a ?? 1 });
              } else {
                variable.setValueForMode(modeId, value as string | number | boolean);
              }
            }
          }
        }

        respond(msg.requestId, true, { id: variable.id, name: variable.name });
        break;
      }
      case 'bind-variable': {
        const node = resolveNode(msg);
        if (!node) break;

        const variable = await figma.variables.getVariableByIdAsync(msg.variableId);
        if (!variable) {
          respond(msg.requestId, false, undefined, 'Variable not found');
          break;
        }

        const property = msg.property as string;

        // Handle fill color binding (most common case)
        if (property.startsWith('fills/') || property === 'fillColor') {
          if ('fills' in node) {
            const fills = (node as GeometryMixin).fills;
            if (Array.isArray(fills) && fills.length > 0) {
              const paint = { ...fills[0] } as SolidPaint;
              const boundPaint = figma.variables.setBoundVariableForPaint(paint, 'color', variable);
              (node as GeometryMixin).fills = [boundPaint];
            }
          }
        } else {
          // Direct property bindings (itemSpacing, paddingTop, cornerRadius, opacity, etc.)
          (node as SceneNode).setBoundVariable(property as VariableBindableNodeField, variable);
        }

        respond(msg.requestId, true, { id: node.id });
        break;
      }

      // ── EXPORT ────────────────────────────────────────────────────────
      case 'export-as-svg': {
        const node = resolveNode(msg);
        if (!node) break;
        const svgBytes = await (node as SceneNode).exportAsync({ format: 'SVG' });
        // Use chunked conversion to avoid stack overflow from spread operator
        const SVG_CHUNK = 512;
        const svgParts: string[] = [];
        for (let i = 0; i < svgBytes.length; i += SVG_CHUNK) {
          const slice = svgBytes.subarray(i, Math.min(i + SVG_CHUNK, svgBytes.length));
          svgParts.push(String.fromCharCode.apply(null, Array.from(slice)));
        }
        const svgString = svgParts.join('');
        respond(msg.requestId, true, { svg: svgString, nodeId: node.id });
        break;
      }

      case 'export-png': {
        const node = resolveNode(msg);
        if (!node) break;
        const scale = (msg.scale as number) ?? 0.25;
        try {
          const pngBytes = await (node as SceneNode).exportAsync({
            format: 'PNG',
            constraint: { type: 'SCALE', value: scale },
          });
          if (!pngBytes || pngBytes.length === 0) {
            respond(msg.requestId, false, undefined, 'exportAsync returned empty data');
            break;
          }
          // Guard against excessively large exports that would choke postMessage
          if (pngBytes.length > 2 * 1024 * 1024) {
            respond(msg.requestId, false, undefined,
              `PNG too large (${(pngBytes.length / 1024).toFixed(0)}KB). Try a smaller scale or a smaller node.`);
            break;
          }
          // Manual base64 encoder -- avoids btoa and String.fromCharCode.apply
          // which can crash in the Figma plugin QuickJS sandbox on large payloads.
          const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
          const len = pngBytes.length;
          const pad = len % 3;
          const chunks: string[] = [];
          // Process in groups of ~3000 bytes to keep string chunks manageable
          const GROUP = 3000;
          for (let g = 0; g < len; g += GROUP) {
            const end = Math.min(g + GROUP, len);
            let chunk = '';
            for (let i = g; i < end; i += 3) {
              const b0 = pngBytes[i];
              const b1 = i + 1 < len ? pngBytes[i + 1] : 0;
              const b2 = i + 2 < len ? pngBytes[i + 2] : 0;
              chunk += B64[b0 >> 2];
              chunk += B64[((b0 & 3) << 4) | (b1 >> 4)];
              chunk += i + 1 < len ? B64[((b1 & 15) << 2) | (b2 >> 6)] : '=';
              chunk += i + 2 < len ? B64[b2 & 63] : '=';
            }
            chunks.push(chunk);
          }
          const base64 = chunks.join('');
          respond(msg.requestId, true, {
            base64,
            width: Math.round(node.width * scale),
            height: Math.round(node.height * scale),
          });
        } catch (exportErr) {
          const errMsg = exportErr instanceof Error ? exportErr.message : String(exportErr);
          respond(msg.requestId, false, undefined, `PNG export failed: ${errMsg}`);
        }
        break;
      }

      // ── ANALYSIS & GENERATION ─────────────────────────────────────────
      case 'apply-style-transfer': {
        const source = figma.getNodeById(msg.sourceNodeId);
        if (!source) { respond(msg.requestId, false, undefined, 'Source not found'); break; }
        const targets = msg.targetNodeIds.map((id: string) => figma.getNodeById(id)).filter(Boolean);
        applyStyleTransfer(source as SceneNode, targets as SceneNode[]);
        respond(msg.requestId, true, { applied: targets.length });
        break;
      }
      case 'generate-component-set': {
        const base = figma.getNodeById(msg.baseNodeId);
        if (!base) { respond(msg.requestId, false, undefined, 'Base not found'); break; }
        const cs = await generateComponentSet(base as SceneNode, msg.variants);
        respond(msg.requestId, true, { id: cs.id, name: cs.name });
        break;
      }
      case 'run-accessibility-audit': {
        const target = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0] ?? null;
        if (!target) { respond(msg.requestId, false, undefined, 'No node'); break; }
        const report = runAccessibilityAudit(target as SceneNode);
        respond(msg.requestId, true, report);
        break;
      }
      case 'export-code': {
        const node = figma.getNodeById(msg.nodeId);
        if (!node) { respond(msg.requestId, false, undefined, 'Not found'); break; }
        let code = '';
        switch (msg.framework) {
          case 'react': code = exportCode(node as SceneNode); break;
          case 'vue': code = exportVue(node as SceneNode); break;
          case 'svelte': code = exportSvelte(node as SceneNode); break;
          case 'html-tailwind': code = exportHtmlTailwind(node as SceneNode); break;
          default: code = exportCode(node as SceneNode);
        }
        respond(msg.requestId, true, { code, framework: msg.framework });
        break;
      }

      // ── SETTINGS ──────────────────────────────────────────────────────
      case 'save-setting': {
        await figma.clientStorage.setAsync(msg.key, msg.value);
        if (msg.requestId) {
          postToUI({ type: 'setting-saved', requestId: msg.requestId, key: msg.key });
        }
        break;
      }
      case 'load-setting': {
        const value = await figma.clientStorage.getAsync(msg.key);
        postToUI({ type: 'setting-loaded', requestId: msg.requestId, key: msg.key, value: value ?? null });
        break;
      }
      case 'resize-ui': {
        figma.ui.resize(msg.width, msg.height);
        break;
      }
      default: break;
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (msg.requestId) respond(msg.requestId, false, undefined, errorMsg);
  }
};
