import type { PluginBridge } from '../hooks/usePlugin';
import type { SerializedNodeCreate, NodeType } from '../../plugin/types';
import { repairJson } from './json-repair';
import { argsToNodeSpec } from './node-spec';

export async function executeToolCall(
  plugin: PluginBridge,
  toolName: string,
  argsJson: string,
  onProgress?: (message: string) => void,
): Promise<unknown> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJson);
  } catch {
    throw new Error(`Invalid tool arguments JSON: ${argsJson}`);
  }

  switch (toolName) {
    // ────────────────────────────────────────────────────────────────────────
    // CREATE & LAYOUT
    // ────────────────────────────────────────────────────────────────────────
    case 'create_frame': {
      const spec: SerializedNodeCreate = {
        type: 'FRAME',
        properties: {
          name: (args.name as string) ?? 'Frame',
          width: (args.width as number) ?? 400,
          height: (args.height as number) ?? 300,
          x: args.x as number | undefined,
          y: args.y as number | undefined,
          cornerRadius: args.cornerRadius as number | undefined,
          clipsContent: args.clipsContent as boolean | undefined,
          layout: {
            layoutMode: (args.layoutMode as 'HORIZONTAL' | 'VERTICAL' | 'NONE') ?? 'VERTICAL',
            itemSpacing: args.itemSpacing as number | undefined,
            paddingTop: args.paddingTop as number | undefined,
            paddingRight: args.paddingRight as number | undefined,
            paddingBottom: args.paddingBottom as number | undefined,
            paddingLeft: args.paddingLeft as number | undefined,
            primaryAxisAlignItems: args.primaryAxisAlignItems as any,
            counterAxisAlignItems: args.counterAxisAlignItems as any,
            primaryAxisSizingMode: (args.primaryAxisSizingMode as 'FIXED' | 'AUTO') ?? 'AUTO',
            counterAxisSizingMode: (args.counterAxisSizingMode as 'FIXED' | 'AUTO') ?? 'AUTO',
          },
          fills: args.fillColor ? [{
            type: 'SOLID',
            color: args.fillColor as { r: number; g: number; b: number },
          }] : undefined,
          effects: args.effects as any,
        },
        parentId: args.parentId as string | undefined,
      };

      return plugin.request(rid => ({
        type: 'create-node' as const,
        requestId: rid,
        node: spec,
      }));
    }

    case 'create_text': {
      const spec: SerializedNodeCreate = {
        type: 'TEXT',
        properties: {
          name: (args.name as string) ?? 'Text',
          x: args.x as number | undefined,
          y: args.y as number | undefined,
          fills: args.textColor ? [{
            type: 'SOLID',
            color: args.textColor as { r: number; g: number; b: number },
          }] : [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
          text: {
            characters: (args.characters as string) ?? 'Text',
            style: {
              fontFamily: (args.fontFamily as string) ?? 'Inter',
              fontStyle: (args.fontStyle as string) ?? 'Regular',
              fontSize: (args.fontSize as number) ?? 14,
              textAlignHorizontal: args.textAlignHorizontal as any,
              lineHeight: args.lineHeight as number | undefined,
              letterSpacing: args.letterSpacing as number | undefined,
            },
          },
        },
        parentId: args.parentId as string | undefined,
      };

      return plugin.request(rid => ({
        type: 'create-node' as const,
        requestId: rid,
        node: spec,
      }));
    }

    case 'create_rectangle': {
      const spec: SerializedNodeCreate = {
        type: 'RECTANGLE',
        properties: {
          name: (args.name as string) ?? 'Rectangle',
          width: (args.width as number) ?? 100,
          height: (args.height as number) ?? 100,
          x: args.x as number | undefined,
          y: args.y as number | undefined,
          cornerRadius: args.cornerRadius as number | undefined,
          opacity: args.opacity as number | undefined,
          fills: args.fillColor ? [{
            type: 'SOLID',
            color: args.fillColor as { r: number; g: number; b: number },
          }] : undefined,
          strokes: args.strokeColor ? [{
            type: 'SOLID',
            color: args.strokeColor as { r: number; g: number; b: number },
          }] : undefined,
          strokeWeight: args.strokeWeight as number | undefined,
        },
        parentId: args.parentId as string | undefined,
      };

      return plugin.request(rid => ({
        type: 'create-node' as const,
        requestId: rid,
        node: spec,
      }));
    }

    case 'create_ellipse': {
      const spec: SerializedNodeCreate = {
        type: 'ELLIPSE',
        properties: {
          name: (args.name as string) ?? 'Ellipse',
          width: (args.width as number) ?? 100,
          height: (args.height as number) ?? 100,
          x: args.x as number | undefined,
          y: args.y as number | undefined,
          opacity: args.opacity as number | undefined,
          fills: args.fillColor ? [{
            type: 'SOLID',
            color: args.fillColor as { r: number; g: number; b: number },
          }] : undefined,
          strokes: args.strokeColor ? [{
            type: 'SOLID',
            color: args.strokeColor as { r: number; g: number; b: number },
          }] : undefined,
          strokeWeight: args.strokeWeight as number | undefined,
        },
        parentId: args.parentId as string | undefined,
      };

      return plugin.request(rid => ({
        type: 'create-node' as const,
        requestId: rid,
        node: spec,
      }));
    }

    case 'create_line': {
      return plugin.request(rid => ({
        type: 'create-line' as const,
        requestId: rid,
        name: (args.name as string) ?? 'Line',
        length: (args.length as number) ?? 100,
        strokeColor: args.strokeColor as { r: number; g: number; b: number } | undefined,
        strokeWeight: (args.strokeWeight as number) ?? 1,
        opacity: args.opacity as number | undefined,
        parentId: args.parentId as string | undefined,
        x: args.x as number | undefined,
        y: args.y as number | undefined,
      }));
    }

    case 'create_svg_node': {
      return plugin.request(rid => ({
        type: 'create-svg-node' as const,
        requestId: rid,
        name: (args.name as string) ?? 'SVG',
        svg: args.svg as string,
        width: args.width as number | undefined,
        height: args.height as number | undefined,
        parentId: args.parentId as string | undefined,
        x: args.x as number | undefined,
        y: args.y as number | undefined,
      }));
    }

    case 'move_to_parent': {
      return plugin.request(rid => ({
        type: 'move-to-parent' as const,
        requestId: rid,
        nodeId: args.nodeId as string,
        parentId: args.parentId as string,
        index: args.index as number | undefined,
      }));
    }

    // ────────────────────────────────────────────────────────────────────────
    // MODIFY & STYLE
    // ────────────────────────────────────────────────────────────────────────
    case 'modify_node': {
      const properties: Record<string, unknown> = {};

      // Basic geometry
      if (args.name !== undefined) properties.name = args.name;
      if (args.x !== undefined) properties.x = args.x;
      if (args.y !== undefined) properties.y = args.y;
      if (args.width !== undefined) properties.width = args.width;
      if (args.height !== undefined) properties.height = args.height;
      if (args.rotation !== undefined) properties.rotation = args.rotation;
      if (args.opacity !== undefined) properties.opacity = args.opacity;
      if (args.visible !== undefined) properties.visible = args.visible;
      if (args.cornerRadius !== undefined) properties.cornerRadius = args.cornerRadius;
      if (args.clipsContent !== undefined) properties.clipsContent = args.clipsContent;

      // Fills
      if (args.removeFills) {
        properties.fills = [];
      } else if (args.fillColor) {
        properties.fills = [{
          type: 'SOLID',
          color: args.fillColor,
          opacity: (args.fillOpacity as number) ?? 1,
        }];
      }

      // Strokes
      if (args.removeStrokes) {
        properties.strokes = [];
      } else if (args.strokeColor) {
        properties.strokes = [{
          type: 'SOLID',
          color: args.strokeColor,
        }];
        if (args.strokeWeight !== undefined) properties.strokeWeight = args.strokeWeight;
        if (args.strokeAlign !== undefined) properties.strokeAlign = args.strokeAlign;
      } else if (args.strokeWeight !== undefined) {
        properties.strokeWeight = args.strokeWeight;
      }

      // Effects
      if (args.effects !== undefined) {
        properties.effects = args.effects;
      }

      // Layout
      const hasLayout = args.layoutMode !== undefined || args.itemSpacing !== undefined ||
        args.paddingTop !== undefined || args.paddingRight !== undefined ||
        args.paddingBottom !== undefined || args.paddingLeft !== undefined ||
        args.primaryAxisAlignItems !== undefined || args.counterAxisAlignItems !== undefined ||
        args.primaryAxisSizingMode !== undefined || args.counterAxisSizingMode !== undefined ||
        args.layoutSizingHorizontal !== undefined || args.layoutSizingVertical !== undefined;

      if (hasLayout) {
        const layout: Record<string, unknown> = {};
        if (args.layoutMode !== undefined) layout.layoutMode = args.layoutMode;
        if (args.itemSpacing !== undefined) layout.itemSpacing = args.itemSpacing;
        if (args.paddingTop !== undefined) layout.paddingTop = args.paddingTop;
        if (args.paddingRight !== undefined) layout.paddingRight = args.paddingRight;
        if (args.paddingBottom !== undefined) layout.paddingBottom = args.paddingBottom;
        if (args.paddingLeft !== undefined) layout.paddingLeft = args.paddingLeft;
        if (args.primaryAxisAlignItems !== undefined) layout.primaryAxisAlignItems = args.primaryAxisAlignItems;
        if (args.counterAxisAlignItems !== undefined) layout.counterAxisAlignItems = args.counterAxisAlignItems;
        if (args.primaryAxisSizingMode !== undefined) layout.primaryAxisSizingMode = args.primaryAxisSizingMode;
        if (args.counterAxisSizingMode !== undefined) layout.counterAxisSizingMode = args.counterAxisSizingMode;
        if (args.layoutSizingHorizontal !== undefined) layout.layoutSizingHorizontal = args.layoutSizingHorizontal;
        if (args.layoutSizingVertical !== undefined) layout.layoutSizingVertical = args.layoutSizingVertical;
        properties.layout = layout;
      }

      // Text properties
      const hasText = args.characters !== undefined || args.fontSize !== undefined ||
        args.fontFamily !== undefined || args.fontStyle !== undefined ||
        args.textColor !== undefined || args.textAlignHorizontal !== undefined ||
        args.lineHeight !== undefined || args.letterSpacing !== undefined;

      if (hasText) {
        const textStyle: Record<string, unknown> = {};
        if (args.fontSize !== undefined) textStyle.fontSize = args.fontSize;
        if (args.fontFamily !== undefined) textStyle.fontFamily = args.fontFamily;
        if (args.fontStyle !== undefined) textStyle.fontStyle = args.fontStyle;
        if (args.textAlignHorizontal !== undefined) textStyle.textAlignHorizontal = args.textAlignHorizontal;
        if (args.lineHeight !== undefined) textStyle.lineHeight = args.lineHeight;
        if (args.letterSpacing !== undefined) textStyle.letterSpacing = args.letterSpacing;

        // DO NOT default fontFamily/fontStyle here. The modifier will read
        // the current font from the node and load it before making changes.
        // Injecting 'Inter' here was the root cause of font reversion bugs.

        properties.text = {
          characters: args.characters,
          style: textStyle,
        };

        // Text color goes into fills for TEXT nodes
        if (args.textColor) {
          properties.fills = [{
            type: 'SOLID',
            color: args.textColor,
          }];
        }
      }

      return plugin.request(rid => ({
        type: 'modify-node' as const,
        requestId: rid,
        nodeId: args.nodeId as string,
        properties,
      }));
    }

    case 'set_fill': {
      return plugin.request(rid => ({
        type: 'set-fill' as const,
        requestId: rid,
        nodeId: args.nodeId as string,
        fills: args.fills as any[],
      }));
    }

    case 'set_stroke': {
      return plugin.request(rid => ({
        type: 'set-stroke' as const,
        requestId: rid,
        nodeId: args.nodeId as string,
        color: args.color as { r: number; g: number; b: number } | undefined,
        weight: args.weight as number | undefined,
        align: args.align as 'CENTER' | 'INSIDE' | 'OUTSIDE' | undefined,
        opacity: args.opacity as number | undefined,
        remove: args.remove as boolean | undefined,
      }));
    }

    case 'set_effects': {
      return plugin.request(rid => ({
        type: 'set-effects' as const,
        requestId: rid,
        nodeId: args.nodeId as string,
        effects: args.effects as any[],
      }));
    }

    case 'delete_node': {
      return plugin.request(rid => ({
        type: 'delete-node' as const,
        requestId: rid,
        nodeId: args.nodeId as string,
      }));
    }

    // ────────────────────────────────────────────────────────────────────────
    // READ & INSPECT
    // ────────────────────────────────────────────────────────────────────────
    case 'get_selection_context': {
      return plugin.request(rid => ({
        type: 'get-selection' as const,
        requestId: rid,
      }));
    }

    case 'get_design_system': {
      return plugin.request(rid => ({
        type: 'get-design-system' as const,
        requestId: rid,
      }));
    }

    case 'read_node_properties': {
      return plugin.request(rid => ({
        type: 'read-node-properties' as const,
        requestId: rid,
        nodeId: args.nodeId as string,
        depth: (args.depth as number) ?? 2,
      }));
    }

    case 'get_page_structure': {
      return plugin.request(rid => ({
        type: 'get-page-context' as const,
        requestId: rid,
        depth: (args.depth as number) ?? 3,
      }));
    }

    case 'find_nodes': {
      return plugin.request(rid => ({
        type: 'find-nodes' as const,
        requestId: rid,
        name: args.name as string | undefined,
        nodeType: args.type as string | undefined,
        parentId: args.parentId as string | undefined,
      }));
    }

    case 'set_selection': {
      return plugin.request(rid => ({
        type: 'set-selection' as const,
        requestId: rid,
        nodeIds: args.nodeIds as string[],
        zoomToFit: (args.zoomToFit as boolean) ?? true,
      }));
    }

    case 'list_available_fonts': {
      return plugin.request(rid => ({
        type: 'list-fonts' as const,
        requestId: rid,
        search: args.search as string | undefined,
        limit: (args.limit as number) ?? 50,
      }));
    }

    // ────────────────────────────────────────────────────────────────────────
    // COMPONENTS & INSTANCES
    // ────────────────────────────────────────────────────────────────────────
    case 'create_component_instance': {
      return plugin.request(rid => ({
        type: 'create-component-instance' as const,
        requestId: rid,
        componentId: args.componentId as string,
        parentId: args.parentId as string | undefined,
        x: args.x as number | undefined,
        y: args.y as number | undefined,
        overrides: args.overrides as Record<string, unknown> | undefined,
      }));
    }

    case 'detach_instance': {
      return plugin.request(rid => ({
        type: 'detach-instance' as const,
        requestId: rid,
        nodeId: args.nodeId as string,
      }));
    }

    // ────────────────────────────────────────────────────────────────────────
    // VECTOR OPERATIONS
    // ────────────────────────────────────────────────────────────────────────
    case 'boolean_operation': {
      return plugin.request(rid => ({
        type: 'boolean-operation' as const,
        requestId: rid,
        nodeIds: args.nodeIds as string[],
        operation: args.operation as 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE',
        name: args.name as string | undefined,
      }));
    }

    case 'flatten_nodes': {
      return plugin.request(rid => ({
        type: 'flatten-nodes' as const,
        requestId: rid,
        nodeIds: args.nodeIds as string[],
      }));
    }

    // ────────────────────────────────────────────────────────────────────────
    // TYPOGRAPHY
    // ────────────────────────────────────────────────────────────────────────
    case 'style_text_range': {
      return plugin.request(rid => ({
        type: 'style-text-range' as const,
        requestId: rid,
        nodeId: args.nodeId as string,
        start: args.start as number,
        end: args.end as number,
        fontSize: args.fontSize as number | undefined,
        fontFamily: args.fontFamily as string | undefined,
        fontStyle: args.fontStyle as string | undefined,
        color: args.color as { r: number; g: number; b: number } | undefined,
        letterSpacing: args.letterSpacing as number | undefined,
        lineHeight: args.lineHeight as number | undefined,
        textDecoration: args.textDecoration as string | undefined,
        textCase: args.textCase as string | undefined,
      }));
    }

    // ────────────────────────────────────────────────────────────────────────
    // CONSTRAINTS
    // ────────────────────────────────────────────────────────────────────────
    case 'set_constraints': {
      return plugin.request(rid => ({
        type: 'set-constraints' as const,
        requestId: rid,
        nodeId: args.nodeId as string,
        horizontal: args.horizontal as string | undefined,
        vertical: args.vertical as string | undefined,
      }));
    }

    // ────────────────────────────────────────────────────────────────────────
    // VARIABLES & TOKENS
    // ────────────────────────────────────────────────────────────────────────
    case 'get_variables': {
      return plugin.request(rid => ({
        type: 'get-variables' as const,
        requestId: rid,
      }));
    }

    case 'create_variable_collection': {
      return plugin.request(rid => ({
        type: 'create-variable-collection' as const,
        requestId: rid,
        name: args.name as string,
        modes: args.modes as string[] | undefined,
      }));
    }

    case 'create_variable': {
      return plugin.request(rid => ({
        type: 'create-variable' as const,
        requestId: rid,
        collectionId: args.collectionId as string,
        name: args.name as string,
        variableType: args.type as string,
        values: args.values as Record<string, unknown> | undefined,
      }));
    }

    case 'bind_variable': {
      return plugin.request(rid => ({
        type: 'bind-variable' as const,
        requestId: rid,
        nodeId: args.nodeId as string,
        property: args.property as string,
        variableId: args.variableId as string,
      }));
    }

    // ────────────────────────────────────────────────────────────────────────
    // EXPORT
    // ────────────────────────────────────────────────────────────────────────
    case 'export_as_svg': {
      return plugin.request(rid => ({
        type: 'export-as-svg' as const,
        requestId: rid,
        nodeId: args.nodeId as string,
      }));
    }

    // ────────────────────────────────────────────────────────────────────────
    // ANALYSIS & GENERATION (existing tools)
    // ────────────────────────────────────────────────────────────────────────
    case 'analyze_accessibility': {
      return plugin.request(rid => ({
        type: 'run-accessibility-audit' as const,
        requestId: rid,
        nodeId: args.nodeId as string | undefined,
      }));
    }

    case 'export_code': {
      return plugin.request(rid => ({
        type: 'export-code' as const,
        requestId: rid,
        nodeId: args.nodeId as string,
        framework: args.framework as 'react' | 'vue' | 'svelte' | 'html-tailwind',
      }));
    }

    case 'apply_style_transfer': {
      return plugin.request(rid => ({
        type: 'apply-style-transfer' as const,
        requestId: rid,
        sourceNodeId: args.sourceNodeId as string,
        targetNodeIds: args.targetNodeIds as string[],
      }));
    }

    case 'generate_component_set': {
      return plugin.request(rid => ({
        type: 'generate-component-set' as const,
        requestId: rid,
        baseNodeId: args.baseNodeId as string,
        variants: { axes: args.axes as any },
      }));
    }

    case 'create_design': {
      // The AI sends a nested JSON tree (not a flat array).
      // We walk it depth-first, creating nodes one-by-one for live canvas feedback.
      const rawNodesJson = args.nodes_json;
      if (!rawNodesJson) throw new Error('create_design requires nodes_json');

      // Optional: insert the entire tree inside an existing frame/artboard
      const targetParentId = args.parentId as string | undefined;

      // If inserting into a parent frame, read its dimensions upfront
      // so we can return them to the AI for dimension-aware design
      let parentInfo: { width?: number; height?: number; layoutMode?: string } | undefined;
      if (targetParentId) {
        try {
          const pResult = await plugin.request(rid => ({
            type: 'read-node-properties' as const,
            requestId: rid,
            nodeId: targetParentId,
            depth: 0,
          }));
          if (pResult && typeof pResult === 'object') {
            const pr = pResult as Record<string, unknown>;
            const layout = pr.layout as Record<string, unknown> | undefined;
            parentInfo = {
              width: pr.width as number | undefined,
              height: pr.height as number | undefined,
              layoutMode: layout?.layoutMode as string | undefined,
            };
          }
        } catch {
          // Non-fatal: proceed without parent dimension info
        }
      }

      // Accept nodes_json as EITHER a string (to be parsed) OR an already-parsed object.
      // Some providers (OpenAI, Google) may send the value as a parsed object even though
      // the schema declares it as type "string". Handle both gracefully.
      let rootNode: Record<string, unknown>;
      if (typeof rawNodesJson === 'object' && rawNodesJson !== null && !Array.isArray(rawNodesJson)) {
        // Already an object -- use directly
        rootNode = rawNodesJson as Record<string, unknown>;
      } else if (typeof rawNodesJson === 'string') {
        try {
          rootNode = JSON.parse(rawNodesJson);
        } catch {
          // AI-generated JSON often has trailing commas or unbalanced brackets.
          // Attempt lightweight repair before giving up.
          try {
            rootNode = JSON.parse(repairJson(rawNodesJson));
          } catch (e2) {
            const preview = rawNodesJson.length > 200 ? rawNodesJson.slice(0, 200) + '...' : rawNodesJson;
            throw new Error(`create_design: invalid JSON in nodes_json (repair failed): ${String(e2)}\nPreview: ${preview}`);
          }
        }
      } else if (Array.isArray(rawNodesJson)) {
        // AI sent an array -- wrap in a root frame
        rootNode = { type: 'FRAME', name: 'Root', layoutMode: 'VERTICAL', children: rawNodesJson };
      } else {
        throw new Error(`create_design: nodes_json must be a JSON string or object, got ${typeof rawNodesJson}`);
      }

      if (!rootNode || typeof rootNode !== 'object') {
        throw new Error('create_design: nodes_json must be a JSON object (nested tree)');
      }

      // Count all nodes in the tree for progress reporting
      function countNodes(n: Record<string, unknown>): number {
        let c = 1;
        const kids = n.children as Record<string, unknown>[] | undefined;
        if (Array.isArray(kids)) {
          for (const kid of kids) c += countNodes(kid);
        }
        return c;
      }

      const total = countNodes(rootNode);
      let progress = 0;
      let successCount = 0;
      const failedNodes: { name: string; error: string }[] = [];
      let rootFigmaId: string | null = null;

      // Depth-first recursive creation -- parent is always created before children
      async function createTree(
        nodeData: Record<string, unknown>,
        parentFigmaId?: string,
      ): Promise<string | null> {
        const nodeName = (nodeData.name as string) || 'Node';
        progress++;
        if (onProgress) {
          onProgress(`Creating ${nodeName}... (${progress}/${total})`);
        }

        // Separate children from node data so argsToNodeSpec doesn't bake them in
        // (we create children incrementally for progress feedback)
        const childrenData = nodeData.children as Record<string, unknown>[] | undefined;
        const nodeOnly = { ...nodeData };
        delete nodeOnly.children;

        // Build spec -- button shortcut still works (FRAME + characters + no children = auto-label)
        const spec = argsToNodeSpec(nodeOnly);
        if (parentFigmaId) {
          spec.parentId = parentFigmaId;
        }

        // Create on canvas
        let figmaId: string | null = null;
        try {
          const result = await plugin.request(rid => ({
            type: 'create-node' as const,
            requestId: rid,
            node: spec,
          }));

          figmaId =
            result && typeof result === 'object' && 'id' in (result as Record<string, unknown>)
              ? ((result as Record<string, unknown>).id as string)
              : null;

          if (figmaId) {
            successCount++;
          } else {
            failedNodes.push({ name: nodeName, error: 'Created but returned no ID' });
          }
        } catch (err) {
          // Non-fatal: log and continue with siblings. Don't abort the whole tree.
          const errMsg = err instanceof Error ? err.message : String(err);
          failedNodes.push({ name: nodeName, error: errMsg });
          console.warn(`[create_design] Failed to create "${nodeName}":`, errMsg);
        }

        // Recurse into children
        if (figmaId && Array.isArray(childrenData) && childrenData.length > 0) {
          for (const child of childrenData) {
            await createTree(child, figmaId);
          }
        }

        return figmaId;
      }

      rootFigmaId = await createTree(rootNode, targetParentId);

      // Zoom to the completed design
      const zoomTarget = rootFigmaId ?? targetParentId;
      if (zoomTarget) {
        await plugin.request(rid => ({
          type: 'zoom-to-node' as const,
          requestId: rid,
          nodeId: zoomTarget,
        }));
      }

      const skipped = total - successCount - failedNodes.length;

      if (onProgress) {
        let msg = `Done -- created ${successCount}/${total} nodes.`;
        if (failedNodes.length > 0) msg += ` ${failedNodes.length} failed.`;
        if (skipped > 0) msg += ` ${skipped} skipped (children of failed nodes).`;
        onProgress(msg);
      }

      return {
        success: failedNodes.length === 0,
        rootNodeId: rootFigmaId ?? undefined,
        nodesCreated: successCount,
        nodesFailed: failedNodes.length,
        ...(skipped > 0 ? { nodesSkipped: skipped } : {}),
        ...(failedNodes.length > 0 ? {
          errors: failedNodes.slice(0, 5),
          hint: 'Some nodes failed. Use modify_node to fix specific issues. Do NOT call create_design again.',
        } : {}),
        ...(rootFigmaId ? { hint_qa: 'Use screenshot_node with rootNodeId to visually verify the design.' } : {}),
        ...(parentInfo ? { parentFrame: { id: targetParentId, ...parentInfo } } : {}),
      };
    }

    case 'screenshot_node': {
      if (!args.nodeId) {
        throw new Error('screenshot_node requires a nodeId. Use the rootNodeId returned by create_design.');
      }

      let result: unknown;
      try {
        result = await plugin.request(rid => ({
          type: 'export-png' as const,
          requestId: rid,
          nodeId: args.nodeId as string,
          scale: (args.scale as number) ?? 0.15,
        }));
      } catch (err) {
        throw new Error(`screenshot_node failed for nodeId "${args.nodeId}": ${err instanceof Error ? err.message : String(err)}. The node may not exist -- check if create_design succeeded.`);
      }

      const r = result as Record<string, unknown>;
      const base64 = r.base64 as string;
      if (!base64) {
        throw new Error(`screenshot_node: export returned no image data for nodeId "${args.nodeId}". The node may have been deleted or is not renderable.`);
      }
      const dataUri = `data:image/png;base64,${base64}`;

      return {
        description: 'Screenshot captured. Analyze the image to verify visual quality, layout, spacing, text readability, and color contrast.',
        nodeId: args.nodeId,
        width: r.width,
        height: r.height,
        imageDataUri: dataUri,
      };
    }

    case 'generate_svg': {
      // Meta-tool: returns instructions for the AI to produce SVG and call create_svg_node
      const style = (args.style as string) || 'icon';
      const defaultSize = style === 'icon' ? 24 : 200;
      const width = (args.width as number) || defaultSize;
      const height = (args.height as number) || width;
      const color = (args.color as string) || 'currentColor';

      return {
        instruction: 'GENERATE_SVG',
        description: `Generate an SVG for: "${args.description}". Style: ${style}, Size: ${width}x${height}, Color: ${color}. ` +
          `Produce clean, minimal SVG markup using <path>, <circle>, <rect>, <line>, <polyline>, <polygon> elements. ` +
          `Use viewBox="0 0 ${width} ${height}". Avoid <text> elements (use Figma text nodes instead). ` +
          `After generating the SVG markup, call create_svg_node with the result to insert it into Figma.`,
        suggestedName: `${style}-${(args.description as string).slice(0, 30).replace(/\s+/g, '-').toLowerCase()}`,
        width,
        height,
        color,
        parentId: args.parentId || null,
      };
    }

    case 'image_to_svg': {
      // Export node as PNG, return base64 + instructions for AI to trace
      const nodeId = args.nodeId as string;
      const detail = (args.detail as string) || 'medium';
      onProgress?.(`Exporting node ${nodeId} as PNG for tracing…`);

      const result = await plugin.request(rid => ({
        type: 'export-png' as const,
        requestId: rid,
        nodeId,
        scale: detail === 'high' ? 2 : detail === 'low' ? 0.5 : 1,
      }));

      const r = result as Record<string, unknown>;
      const base64 = r.base64 as string;
      if (!base64) {
        throw new Error(`image_to_svg: export returned no image data for nodeId "${nodeId}".`);
      }
      const dataUri = `data:image/png;base64,${base64}`;

      return {
        instruction: 'IMAGE_TO_SVG',
        description: `Analyze this raster image and recreate it as clean SVG vector markup. Detail level: ${detail}. ` +
          `Trace the main shapes, paths, and colors visible in the image. Produce an SVG with viewBox matching the image dimensions. ` +
          `After generating the SVG, call create_svg_node to insert it into Figma.`,
        imageDataUri: dataUri,
        width: r.width,
        height: r.height,
        sourceNodeId: nodeId,
        detail,
      };
    }

    case 'scan_design_system': {
      const includeComponents = args.includeComponents !== false;
      const includeStyles = args.includeStyles !== false;
      const includeVariables = args.includeVariables !== false;
      onProgress?.('Scanning design system…');

      const result = await plugin.request(rid => ({
        type: 'get-design-system' as const,
        requestId: rid,
      }));

      const ds = result as Record<string, unknown>;
      const filtered: Record<string, unknown> = {};

      if (includeComponents && ds.components) {
        filtered.components = ds.components;
      }
      if (includeStyles) {
        if (ds.paintStyles) filtered.paintStyles = ds.paintStyles;
        if (ds.textStyles) filtered.textStyles = ds.textStyles;
        if (ds.effectStyles) filtered.effectStyles = ds.effectStyles;
        if (ds.gridStyles) filtered.gridStyles = ds.gridStyles;
      }
      if (includeVariables && ds.variables) {
        filtered.variables = ds.variables;
      }

      return filtered;
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
