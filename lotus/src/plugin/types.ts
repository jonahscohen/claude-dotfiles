// ─── Message Protocol ────────────────────────────────────────────────────────
// All communication between the plugin sandbox and UI iframe uses typed
// discriminated unions. The `type` field is the discriminant.

// ─── UI -> Plugin Messages ───────────────────────────────────────────────────

export interface CreateNodeMsg {
  type: 'create-node';
  requestId: string;
  node: SerializedNodeCreate;
}

export interface ModifyNodeMsg {
  type: 'modify-node';
  requestId: string;
  nodeId: string;
  properties: Partial<SerializedNodeProperties>;
}

export interface DeleteNodeMsg {
  type: 'delete-node';
  requestId: string;
  nodeId: string;
}

export interface GetSelectionMsg {
  type: 'get-selection';
  requestId: string;
}

export interface GetDesignSystemMsg {
  type: 'get-design-system';
  requestId: string;
}

export interface GetPageContextMsg {
  type: 'get-page-context';
  requestId: string;
  depth?: number;
}

export interface RunAccessibilityAuditMsg {
  type: 'run-accessibility-audit';
  requestId: string;
  nodeId?: string;
}

export interface ExportCodeMsg {
  type: 'export-code';
  requestId: string;
  nodeId: string;
  framework: 'react' | 'vue' | 'svelte' | 'html-tailwind';
}

export interface ApplyStyleTransferMsg {
  type: 'apply-style-transfer';
  requestId: string;
  sourceNodeId: string;
  targetNodeIds: string[];
}

export interface GenerateComponentSetMsg {
  type: 'generate-component-set';
  requestId: string;
  baseNodeId: string;
  variants: VariantConfig;
}

export interface SaveSettingMsg {
  type: 'save-setting';
  requestId: string;
  key: string;
  value: string;
}

export interface LoadSettingMsg {
  type: 'load-setting';
  requestId: string;
  key: string;
}

export interface BatchCreateNodesMsg {
  type: 'batch-create-nodes';
  requestId: string;
  nodes: SerializedNodeCreate[];
  parentId?: string;
}

export interface ResizeUiMsg {
  type: 'resize-ui';
  width: number;
  height: number;
}

export type UIToPluginMessage =
  | CreateNodeMsg
  | ModifyNodeMsg
  | DeleteNodeMsg
  | GetSelectionMsg
  | GetDesignSystemMsg
  | GetPageContextMsg
  | RunAccessibilityAuditMsg
  | ExportCodeMsg
  | ApplyStyleTransferMsg
  | GenerateComponentSetMsg
  | SaveSettingMsg
  | LoadSettingMsg
  | BatchCreateNodesMsg
  | ResizeUiMsg;

// ─── Plugin -> UI Messages ───────────────────────────────────────────────────

export interface SelectionChangedMsg {
  type: 'selection-changed';
  selection: SerializedNode[];
}

export interface ResponseMsg {
  type: 'response';
  requestId: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface SettingLoadedMsg {
  type: 'setting-loaded';
  requestId: string;
  key: string;
  value: string | null;
}

export interface SettingSavedMsg {
  type: 'setting-saved';
  requestId: string;
  key: string;
}

export interface PluginReadyMsg {
  type: 'plugin-ready';
}

export type PluginToUIMessage =
  | SelectionChangedMsg
  | ResponseMsg
  | SettingLoadedMsg
  | SettingSavedMsg
  | PluginReadyMsg;

// ─── Serialized Node Types ───────────────────────────────────────────────────
// These are JSON-safe representations of Figma nodes, used across the
// message boundary.

export type NodeType =
  | 'FRAME'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'TEXT'
  | 'LINE'
  | 'VECTOR'
  | 'COMPONENT'
  | 'INSTANCE'
  | 'GROUP'
  | 'STAR'
  | 'POLYGON'
  | 'BOOLEAN_OPERATION'
  | 'SECTION';

export interface SerializedColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface SerializedSolidPaint {
  type: 'SOLID';
  color: SerializedColor;
  opacity?: number;
  visible?: boolean;
}

export interface SerializedGradientStop {
  position: number;
  color: SerializedColor;
}

export interface SerializedGradientPaint {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
  gradientStops: SerializedGradientStop[];
  opacity?: number;
  visible?: boolean;
}

export type SerializedPaint = SerializedSolidPaint | SerializedGradientPaint;

export interface SerializedEffect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  color?: SerializedColor;
  offset?: { x: number; y: number };
  radius: number;
  spread?: number;
  visible?: boolean;
}

export interface SerializedTextStyle {
  fontFamily: string;
  fontStyle: string;
  fontSize: number;
  fontWeight?: number;
  lineHeight?: number | 'AUTO';
  letterSpacing?: number;
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
}

export interface SerializedLayoutProperties {
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID';
  primaryAxisAlignItems?: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'MAX' | 'CENTER' | 'BASELINE';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
  layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';
}

export interface SerializedNodeProperties {
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  fills?: SerializedPaint[];
  strokes?: SerializedPaint[];
  strokeWeight?: number;
  strokeAlign?: 'CENTER' | 'INSIDE' | 'OUTSIDE';
  cornerRadius?: number;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomLeftRadius?: number;
  bottomRightRadius?: number;
  effects?: SerializedEffect[];
  blendMode?: string;
  clipsContent?: boolean;
  layout?: SerializedLayoutProperties;
  text?: {
    characters: string;
    style: SerializedTextStyle;
  };
}

export interface SerializedNode {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: SerializedNodeProperties;
  children?: SerializedNode[];
}

export interface SerializedNodeCreate {
  type: NodeType;
  properties: SerializedNodeProperties;
  children?: SerializedNodeCreate[];
  parentId?: string;
}

// ─── Design System Types ─────────────────────────────────────────────────────

export interface SerializedPaintStyle {
  id: string;
  name: string;
  paints: SerializedPaint[];
}

export interface SerializedTextStyleDef {
  id: string;
  name: string;
  style: SerializedTextStyle;
}

export interface SerializedEffectStyle {
  id: string;
  name: string;
  effects: SerializedEffect[];
}

export interface SerializedVariable {
  id: string;
  name: string;
  resolvedType: string;
  valuesByMode: Record<string, unknown>;
}

export interface SerializedVariableCollection {
  id: string;
  name: string;
  modes: { modeId: string; name: string }[];
  variables: SerializedVariable[];
}

export interface SerializedComponent {
  id: string;
  name: string;
  description: string;
  properties: Record<string, { type: string; defaultValue: unknown }>;
}

export interface DesignSystemContext {
  paintStyles: SerializedPaintStyle[];
  textStyles: SerializedTextStyleDef[];
  effectStyles: SerializedEffectStyle[];
  variables: SerializedVariableCollection[];
  components: SerializedComponent[];
}

// ─── Variant Config ──────────────────────────────────────────────────────────

export interface VariantAxis {
  name: string;
  values: string[];
}

export interface VariantConfig {
  axes: VariantAxis[];
  overrides?: Record<string, Partial<SerializedNodeProperties>>;
}

// ─── Accessibility Types ─────────────────────────────────────────────────────

export type AuditSeverity = 'error' | 'warning' | 'info';

export interface AccessibilityIssue {
  severity: AuditSeverity;
  rule: string;
  message: string;
  nodeId: string;
  nodeName: string;
  suggestion?: string;
}

export interface AccessibilityReport {
  issues: AccessibilityIssue[];
  score: number;
  checkedNodes: number;
}
