import { WebSocketServer, WebSocket } from 'ws';
import { createServer, type Server as HttpServer, type IncomingMessage, type ServerResponse } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ConnectionManager } from './connection-manager.js';
import type { JsonRpcRequest, JsonRpcResponse, JsonRpcMessage } from './types.js';

type MessageHandler = (connectionId: string, params: Record<string, unknown> | undefined) => unknown | Promise<unknown>;

export class WsServer {
  private wss: WebSocketServer | null = null;
  private httpServer: HttpServer | null = null;
  private manager = new ConnectionManager();
  private handlers = new Map<string, MessageHandler>();
  private port: number | null = null;
  private distDir: string;

  constructor() {
    const serverDir = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
    this.distDir = join(serverDir, '..');
  }

  async start(preferredPort: number): Promise<number> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = preferredPort + attempt;
      try {
        const port = await this.tryListen(candidate);
        this.port = port;
        return port;
      } catch {
        // port occupied, try next
      }
    }
    throw new Error(`Could not find an available port in range ${preferredPort}-${preferredPort + 9}`);
  }

  private tryListen(port: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
        this.handleHttpRequest(req, res);
      });

      const wss = new WebSocketServer({ server: httpServer });

      httpServer.once('listening', () => {
        this.httpServer = httpServer;
        this.wss = wss;
        this.attachConnectionHandler();
        resolve(port);
      });

      httpServer.once('error', (err) => {
        reject(err);
      });

      httpServer.listen(port);
    });
  }

  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    try {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');

      // Serve fonts
      if (req.method === 'GET' && req.url?.startsWith('/fonts/')) {
        const fontName = req.url.replace('/fonts/', '');
        const fontPath = join(this.distDir, '..', 'fonts', fontName);
        if (existsSync(fontPath)) {
          const data = readFileSync(fontPath);
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'font/woff2');
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          res.end(data);
          return;
        }
      }
      if (req.method === 'GET' && req.url === '/improv-core.js') {
      const filePath = join(this.distDir, 'improv-core.js');
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/javascript' });
          res.end(content);
        } else {
          res.writeHead(404);
          res.end('improv-core.js not found');
        }
        return;
      }

      if (req.method === 'GET' && req.url?.startsWith('/improv-') && req.url?.endsWith('.js')) {
        const fileName = req.url.slice(1);
        const filePath = join(this.distDir, fileName);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/javascript' });
          res.end(content);
        } else {
          res.writeHead(404);
          res.end(`${fileName} not found`);
        }
        return;
      }

      if (req.method === 'GET' && req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          server: 'improv',
          port: this.port,
          connections: this.manager.size(),
        }));
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    } catch (err) {
      process.stderr.write(`[improv] HTTP request error (non-fatal): ${err instanceof Error ? err.message : err}\n`);
      try { res.writeHead(500); res.end('Internal error'); } catch {}
    }
  }

  private attachConnectionHandler(): void {
    if (!this.wss) return;

    this.wss.on('error', (err: Error) => {
      process.stderr.write(`[improv] WSS error (non-fatal): ${err?.message ?? err}\n`);
    });
    if (this.httpServer) {
      this.httpServer.on('error', (err: Error) => {
        process.stderr.write(`[improv] HTTP server error (non-fatal): ${err?.message ?? err}\n`);
      });
    }

    this.wss.on('connection', (ws: WebSocket) => {
      let handshakeDone = false;

      ws.on('error', (err: Error) => {
        process.stderr.write(`[improv] WebSocket client error (non-fatal): ${err?.message ?? err}\n`);
      });

      const timer = setTimeout(() => {
        if (!handshakeDone) {
          try { ws.close(4001, 'Handshake timeout'); } catch {}
        }
      }, 5000);

      ws.once('message', (raw: Buffer | string) => {
        clearTimeout(timer);

        let msg: JsonRpcRequest;
        try {
          msg = JSON.parse(raw.toString()) as JsonRpcRequest;
        } catch {
          try { ws.close(4002, 'Invalid JSON'); } catch {}
          return;
        }

        if (msg.method !== 'handshake') {
          try { ws.close(4002, 'Expected handshake'); } catch {}
          return;
        }

        handshakeDone = true;

        const params = msg.params ?? {};
        const tabUrl = (params.tabUrl as string) ?? '';
        const tabTitle = (params.tabTitle as string) ?? '';
        const connectionId = this.manager.add(ws, tabUrl, tabTitle);

        const response: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: msg.id,
          result: { connectionId },
        };
        try { ws.send(JSON.stringify(response)); } catch {}

        ws.on('message', (data: Buffer | string) => {
          this.handleMessage(ws, connectionId, data.toString());
        });

        ws.on('close', () => {
          this.manager.remove(connectionId);
        });
      });

      ws.on('close', () => {
        if (!handshakeDone) {
          clearTimeout(timer);
        }
      });
    });
  }

  private async handleMessage(ws: WebSocket, connectionId: string, raw: string): Promise<void> {
    let msg: JsonRpcRequest;
    try {
      msg = JSON.parse(raw) as JsonRpcRequest;
    } catch {
      return;
    }

    const handler = this.handlers.get(msg.method);
    if (!handler) {
      const errorResponse: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32601, message: 'Method not found' },
      };
      try { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(errorResponse)); } catch {}
      return;
    }

    try {
      const result = await handler(connectionId, msg.params);
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: msg.id,
        result,
      };
      try { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(response)); } catch {}
    } catch (err) {
      const errorResponse: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: msg.id,
        error: {
          code: -32000,
          message: err instanceof Error ? err.message : 'Internal error',
        },
      };
      try { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(errorResponse)); } catch {}
    }
  }

  onMessage(method: string, handler: MessageHandler): void {
    this.handlers.set(method, handler);
  }

  broadcastToClients(method: string, params?: Record<string, unknown>): void {
    const message: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 0,
      method,
      params,
    };
    this.manager.broadcast(message);
  }

  getConnections() {
    return this.manager.getAll();
  }

  getPort(): number | null {
    return this.port;
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.httpServer) {
        resolve();
        return;
      }
      this.wss?.close();
      this.httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
