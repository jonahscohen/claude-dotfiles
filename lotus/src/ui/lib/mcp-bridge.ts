import type { PluginBridge } from '../hooks/usePlugin';

const POLL_INTERVAL = 500;
const RETRY_INTERVAL = 3000;

export type McpStatus = 'disconnected' | 'connected';

export interface McpAction {
  toolType: string;
  success: boolean;
  summary: string;
  timestamp: number;
}

export interface McpUiHandlers {
  onPrompt: (prompt: string) => Promise<void>;
  onCancelStream: () => void;
  onClearChat: () => void;
  onNewConversation: () => Promise<void>;
  onGetChatStatus: () => { isStreaming: boolean; messageCount: number; tokenUsage: { input: number; output: number } };
  onGetChatMessages: (limit?: number) => { role: string; content: string; timestamp: number }[];
  onSetMode: (mode: string) => void;
  onGetMode: () => string;
  onListConversations: () => { id: string; title: string; createdAt: number; messageCount: number }[];
  onLoadConversation: (id: string) => Promise<boolean>;
  onSaveConversation: () => Promise<string | null>;
  onDeleteConversation: (id: string) => Promise<void>;
}

/**
 * Client-side HTTP polling bridge for MCP integration.
 *
 * Auto-connects on creation and retries silently in the background.
 * When the server comes online, the bridge starts polling for tool calls.
 * When the server goes offline, it reverts to retry mode automatically.
 */
export class McpBridgeClient {
  private plugin: PluginBridge | null = null;
  private port: number;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private _status: McpStatus = 'disconnected';
  private onStatusChange?: (status: McpStatus) => void;
  private onAction?: (action: McpAction) => void;
  private onLog?: (msg: string) => void;
  private uiHandlers?: McpUiHandlers;
  private stopped = false;

  constructor(
    port: number,
    onStatusChange?: (status: McpStatus) => void,
    onAction?: (action: McpAction) => void,
    onLog?: (msg: string) => void,
    uiHandlers?: McpUiHandlers,
  ) {
    this.port = port;
    this.onStatusChange = onStatusChange;
    this.onAction = onAction;
    this.onLog = onLog;
    this.uiHandlers = uiHandlers;
  }

  private log(msg: string): void {
    this.onLog?.(msg);
  }

  get isConnected(): boolean {
    return this._status === 'connected';
  }

  get status(): McpStatus {
    return this._status;
  }

  /**
   * Start the auto-connect loop. Retries silently until the server appears.
   */
  connect(plugin: PluginBridge): void {
    this.plugin = plugin;
    this.stopped = false;
    this.retryCount = 0;
    this.log(`Connecting to localhost:${this.port}...`);
    this.tryConnect();
  }

  /**
   * Stop everything - polling, retrying, disconnect.
   */
  disconnect(): void {
    this.stopped = true;
    this.stopPolling();
    this.stopRetry();
    this.setStatus('disconnected');
  }

  private async tryConnect(): Promise<void> {
    if (this.stopped) return;

    try {
      const res = await fetch(`http://localhost:${this.port}/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (this.stopped) return;
      await res.json();
      this.retryCount = 0;
      this.setStatus('connected');
      this.log('Connected. Polling for tool calls.');
      this.startPolling();
    } catch (err) {
      if (this.stopped) return;
      const msg = err instanceof Error ? err.message : String(err);
      // Only log the first failure and every 10th retry to avoid spam
      if (this.retryCount === 0) {
        this.log(`Connection failed: ${msg}`);
        this.log('Retrying in background...');
      } else if (this.retryCount % 10 === 0) {
        this.log(`Still trying... (attempt ${this.retryCount})`);
      }
      this.setStatus('disconnected');
      this.scheduleRetry();
    }
  }

  private retryCount = 0;

  private scheduleRetry(): void {
    this.stopRetry();
    if (this.stopped) return;
    this.retryCount++;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.tryConnect();
    }, RETRY_INTERVAL);
  }

  private stopRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async poll(): Promise<void> {
    if (!this.plugin || this._status !== 'connected' || this.stopped) return;

    try {
      const res = await fetch(`http://localhost:${this.port}/poll`);

      if (res.status === 204) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const msg = await res.json();
      const requestId = msg.requestId;
      if (!requestId) return;

      // Intercept UI-layer messages: route to React state, not the plugin sandbox
      const uiResult = await this.handleUiMessage(msg, requestId);
      if (uiResult !== undefined) return;

      try {
        const result = await this.plugin.request((_rid) => {
          return { ...msg, requestId: _rid };
        });

        await fetch(`http://localhost:${this.port}/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, success: true, data: result }),
        });

        this.onAction?.({
          toolType: msg.type ?? 'unknown',
          success: true,
          summary: this.buildActionSummary(msg, result, true),
          timestamp: Date.now(),
        });
      } catch (err) {
        await fetch(`http://localhost:${this.port}/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        });

        this.onAction?.({
          toolType: msg.type ?? 'unknown',
          success: false,
          summary: this.buildActionSummary(msg, null, false),
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      // Server went away - stop polling, start retrying
      if (this._status === 'connected') {
        const msg = err instanceof Error ? err.message : String(err);
        this.log(`Lost connection: ${msg}`);
        this.stopPolling();
        this.setStatus('disconnected');
        this.log(`Retrying in ${RETRY_INTERVAL / 1000}s...`);
        this.scheduleRetry();
      }
    }
  }

  /**
   * Handle messages that target UI/React state rather than the Figma plugin sandbox.
   * Returns a truthy value if handled, undefined if the message should pass through.
   */
  private async handleUiMessage(msg: Record<string, unknown>, requestId: string): Promise<true | undefined> {
    const h = this.uiHandlers;
    if (!h) return undefined;

    const type = msg.type as string;
    const respond = async (success: boolean, data: unknown, error?: string) => {
      await fetch(`http://localhost:${this.port}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(success ? { requestId, success, data } : { requestId, success, error }),
      });
      this.onAction?.({
        toolType: type,
        success,
        summary: success ? this.uiActionSummary(type) : `Failed: ${error}`,
        timestamp: Date.now(),
      });
    };

    try {
      switch (type) {
        case 'send-prompt': {
          this.log(`Received prompt: "${(msg.prompt as string)?.slice(0, 60)}..."`);
          await h.onPrompt(msg.prompt as string);
          await respond(true, { status: 'prompt_sent' });
          return true;
        }
        case 'cancel-stream': {
          h.onCancelStream();
          await respond(true, { status: 'cancelled' });
          return true;
        }
        case 'clear-chat': {
          h.onClearChat();
          await respond(true, { status: 'cleared' });
          return true;
        }
        case 'new-conversation': {
          await h.onNewConversation();
          await respond(true, { status: 'new_conversation_started' });
          return true;
        }
        case 'get-chat-status': {
          const status = h.onGetChatStatus();
          await respond(true, status);
          return true;
        }
        case 'get-chat-messages': {
          const messages = h.onGetChatMessages(msg.limit as number | undefined);
          await respond(true, { messages });
          return true;
        }
        case 'set-mode': {
          h.onSetMode(msg.mode as string);
          await respond(true, { mode: msg.mode });
          return true;
        }
        case 'get-mode': {
          const mode = h.onGetMode();
          await respond(true, { mode });
          return true;
        }
        case 'list-conversations': {
          const conversations = h.onListConversations();
          await respond(true, { conversations });
          return true;
        }
        case 'load-conversation': {
          const loaded = await h.onLoadConversation(msg.id as string);
          await respond(true, { loaded });
          return true;
        }
        case 'save-conversation': {
          const id = await h.onSaveConversation();
          await respond(true, { id });
          return true;
        }
        case 'delete-conversation': {
          await h.onDeleteConversation(msg.id as string);
          await respond(true, { status: 'deleted' });
          return true;
        }
        default:
          return undefined;
      }
    } catch (err) {
      await respond(false, null, err instanceof Error ? err.message : String(err));
      return true;
    }
  }

  private uiActionSummary(type: string): string {
    const map: Record<string, string> = {
      'send-prompt': 'Sent prompt to agent',
      'cancel-stream': 'Cancelled stream',
      'clear-chat': 'Cleared chat',
      'new-conversation': 'Started new conversation',
      'get-chat-status': 'Read chat status',
      'get-chat-messages': 'Read chat messages',
      'set-mode': 'Changed mode',
      'get-mode': 'Read mode',
      'list-conversations': 'Listed conversations',
      'load-conversation': 'Loaded conversation',
      'save-conversation': 'Saved conversation',
      'delete-conversation': 'Deleted conversation',
    };
    return map[type] ?? type.replace(/-/g, ' ');
  }

  private buildActionSummary(msg: Record<string, unknown>, result: unknown, success: boolean): string {
    const type = (msg.type as string) ?? 'unknown';
    let summary: string;

    switch (type) {
      case 'create-node': {
        const name =
          (msg as any).node?.properties?.name ??
          (msg as any).spec?.name ??
          'node';
        const nodeType = (msg as any).node?.type ?? (msg as any).spec?.type ?? 'node';
        summary = `Created ${nodeType} '${name}'`;
        break;
      }
      case 'create-svg-node':
        summary = 'Created SVG node';
        break;
      case 'batch-create-nodes': {
        const count = Array.isArray((msg as any).nodes) ? (msg as any).nodes.length : '?';
        summary = `Created ${count} nodes`;
        break;
      }
      case 'modify-node':
        summary = 'Modified node';
        break;
      case 'delete-node':
        summary = 'Deleted node';
        break;
      case 'move-to-parent':
        summary = 'Moved node to parent';
        break;
      case 'set-fill':
        summary = 'Set fill';
        break;
      case 'set-stroke':
        summary = 'Set stroke';
        break;
      case 'set-effects':
        summary = 'Set effects';
        break;
      case 'set-selection':
        summary = 'Set selection';
        break;
      case 'get-selection':
        summary = 'Read selection';
        break;
      case 'get-design-system':
        summary = 'Read design system';
        break;
      case 'read-node-properties':
        summary = 'Read node properties';
        break;
      case 'get-page-context':
        summary = 'Read page context';
        break;
      case 'find-nodes':
        summary = 'Found nodes';
        break;
      case 'list-fonts':
        summary = 'Listed fonts';
        break;
      case 'export-as-svg':
        summary = 'Exported as SVG';
        break;
      case 'export-code':
        summary = 'Exported code';
        break;
      case 'export-png':
        summary = 'Exported as PNG';
        break;
      case 'run-accessibility-audit':
        summary = 'Ran accessibility audit';
        break;
      case 'apply-style-transfer':
        summary = 'Applied style transfer';
        break;
      case 'get-variables':
        summary = 'Read variables';
        break;
      case 'create-variable':
        summary = 'Created variable';
        break;
      case 'bind-variable':
        summary = 'Bound variable';
        break;
      default:
        summary = type.replace(/-/g, ' ');
        break;
    }

    if (!success) {
      summary = `Failed: ${summary}`;
    }

    return summary;
  }

  private setStatus(status: McpStatus): void {
    if (this._status !== status) {
      this._status = status;
      this.onStatusChange?.(status);
    }
  }
}
