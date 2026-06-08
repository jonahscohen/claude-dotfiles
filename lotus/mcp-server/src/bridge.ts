import http from 'node:http';

const TIMEOUT_MS = 30_000;
const PROMPT_TIMEOUT_MS = 180_000; // 3 min for AI-driven prompts

interface PendingRequest {
  resolve: (data: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface QueuedMessage {
  requestId: string;
  message: Record<string, unknown>;
}

/**
 * HTTP bridge between MCP server and Lotus UI iframe.
 *
 * Architecture:
 *   MCP Client (stdio) -> MCP Server -> HTTP -> UI Iframe -> postMessage -> Plugin Sandbox
 *
 * Endpoints:
 *   GET  /poll    - Plugin fetches pending tool-call messages (long-poll, returns immediately if queue non-empty)
 *   POST /respond - Plugin sends tool-call results back
 *   GET  /status  - Health check (used by plugin to verify connection)
 *
 * The UI iframe polls /poll via fetch(). When the MCP server queues a tool call,
 * the next poll picks it up. The plugin executes it and POSTs the result to /respond.
 */
export class FigmaBridge {
  private server: http.Server;
  private pending = new Map<string, PendingRequest>();
  private queue: QueuedMessage[] = [];
  private requestCounter = 0;
  private _isConnected = false;
  private lastPollTime = 0;
  private connectionCheckInterval: ReturnType<typeof setInterval>;

  constructor(port: number) {
    const handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
      // CORS headers for Figma iframe
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      // Chromium Private Network Access: Figma's https iframe -> localhost is a
      // private-network request. Without this header the preflight is rejected
      // and the plugin's fetch never reaches the bridge (curl is unaffected).
      res.setHeader('Access-Control-Allow-Private-Network', 'true');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === 'GET' && req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', pending: this.queue.length }));
        return;
      }

      if (req.method === 'GET' && req.url === '/poll') {
        this.handlePoll(res);
        return;
      }

      if (req.method === 'POST' && req.url === '/respond') {
        this.handleRespond(req, res);
        return;
      }

      // Test endpoint: queue a raw plugin message and return the result
      if (req.method === 'POST' && req.url === '/exec') {
        this.handleExec(req, res);
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    };

    this.server = http.createServer(handler);

    this.server.listen(port, () => {
      console.error(`[lotus-mcp] HTTP bridge listening on port ${port}`);
    });

    // Consider plugin disconnected if no poll in 5 seconds
    this.connectionCheckInterval = setInterval(() => {
      const wasConnected = this._isConnected;
      this._isConnected = Date.now() - this.lastPollTime < 5000;
      if (wasConnected && !this._isConnected) {
        console.error('[lotus-mcp] Figma plugin disconnected (poll timeout)');
        // Reject all pending requests
        for (const [id, req] of this.pending) {
          clearTimeout(req.timer);
          req.reject(new Error('Figma plugin disconnected'));
        }
        this.pending.clear();
        this.queue = [];
      }
    }, 2000);
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Queue a plugin message and wait for a response from the plugin.
   */
  async request(message: Record<string, unknown>): Promise<unknown> {
    if (!this._isConnected) {
      throw new Error(
        'Figma plugin is not connected. Open Lotus in Figma and enable MCP Bridge in Settings.'
      );
    }

    const requestId = `mcp-${++this.requestCounter}`;
    message.requestId = requestId;

    const timeout = message.type === 'send-prompt' ? PROMPT_TIMEOUT_MS : TIMEOUT_MS;

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        this.queue = this.queue.filter(q => q.requestId !== requestId);
        reject(new Error(`Request timed out after ${timeout}ms: ${message.type}`));
      }, timeout);

      this.pending.set(requestId, { resolve, reject, timer });
      this.queue.push({ requestId, message });
    });
  }

  private handlePoll(res: http.ServerResponse): void {
    const wasConnected = this._isConnected;
    this.lastPollTime = Date.now();
    this._isConnected = true;

    if (!wasConnected) {
      console.error('[lotus-mcp] Figma plugin connected');
    }

    if (this.queue.length > 0) {
      const item = this.queue.shift()!;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(item.message));
    } else {
      // Nothing pending - return empty
      res.writeHead(204);
      res.end();
    }
  }

  private handleRespond(req: http.IncomingMessage, res: http.ServerResponse): void {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const msg = JSON.parse(body);
        const requestId = msg.requestId as string;
        if (!requestId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing requestId' }));
          return;
        }

        const pending = this.pending.get(requestId);
        if (!pending) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No pending request with that ID' }));
          return;
        }

        clearTimeout(pending.timer);
        this.pending.delete(requestId);

        if (msg.success) {
          pending.resolve(msg.data);
        } else {
          pending.reject(new Error((msg.error as string) || 'Plugin request failed'));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }

  private handleExec(req: http.IncomingMessage, res: http.ServerResponse): void {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const message = JSON.parse(body);
        const result = await this.request(message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: result }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }));
      }
    });
  }

  close(): void {
    clearInterval(this.connectionCheckInterval);
    for (const [, req] of this.pending) {
      clearTimeout(req.timer);
      req.reject(new Error('Bridge shutting down'));
    }
    this.pending.clear();
    this.server.close();
  }
}
