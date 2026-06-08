import type { UIToPluginMessage, PluginToUIMessage } from '../../plugin/types';

type ResponseHandler = (msg: PluginToUIMessage) => void;

const pendingRequests = new Map<string, {
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
}>();

let messageId = 0;

// Listen for all messages from plugin sandbox
window.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data.pluginMessage as PluginToUIMessage | undefined;
  if (!msg) return;

  if (msg.type === 'response' || msg.type === 'setting-loaded' || msg.type === 'setting-saved') {
    const requestId = msg.requestId;
    const pending = pendingRequests.get(requestId);
    if (pending) {
      pendingRequests.delete(requestId);
      if (msg.type === 'response') {
        if (msg.success) {
          pending.resolve(msg.data);
        } else {
          pending.reject(new Error(msg.error ?? 'Unknown error'));
        }
      } else if (msg.type === 'setting-saved') {
        pending.resolve(true);
      } else {
        pending.resolve(msg.value);
      }
    }
  }
});

function generateRequestId(): string {
  return `req_${++messageId}_${Date.now()}`;
}

export function postToPlugin(msg: UIToPluginMessage): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}

export function requestFromPlugin<T = unknown>(
  msgBuilder: (requestId: string) => UIToPluginMessage,
  timeoutMs = 30000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const requestId = generateRequestId();
    const msg = msgBuilder(requestId);

    pendingRequests.set(requestId, {
      resolve: resolve as (data: unknown) => void,
      reject,
    });

    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`Request ${requestId} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // Clear timeout on resolution
    const original = pendingRequests.get(requestId)!;
    pendingRequests.set(requestId, {
      resolve: (data) => {
        clearTimeout(timer);
        original.resolve(data);
      },
      reject: (err) => {
        clearTimeout(timer);
        original.reject(err);
      },
    });

    postToPlugin(msg);
  });
}

// ─── Convenience wrappers ────────────────────────────────────────────────────

export function getSelection() {
  return requestFromPlugin(requestId => ({
    type: 'get-selection' as const,
    requestId,
  }));
}

export function getDesignSystem() {
  return requestFromPlugin(requestId => ({
    type: 'get-design-system' as const,
    requestId,
  }));
}

export function getPageContext(depth?: number) {
  return requestFromPlugin(requestId => ({
    type: 'get-page-context' as const,
    requestId,
    depth,
  }));
}

export function saveSetting(key: string, value: string): Promise<boolean> {
  return requestFromPlugin<boolean>(requestId => ({
    type: 'save-setting' as const,
    requestId,
    key,
    value,
  }));
}

export function loadSetting(key: string): Promise<string | null> {
  return requestFromPlugin<string | null>(requestId => ({
    type: 'load-setting' as const,
    requestId,
    key,
  }));
}

export function resizeUI(width: number, height: number) {
  postToPlugin({ type: 'resize-ui', width, height });
}

export function onPluginMessage(handler: ResponseHandler): () => void {
  const listener = (event: MessageEvent) => {
    const msg = event.data.pluginMessage as PluginToUIMessage | undefined;
    if (msg) handler(msg);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
