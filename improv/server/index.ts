import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WsServer } from './ws-server.js';
import { registerTools } from './mcp-tools.js';

const DEFAULT_WS_PORT = 9223;

async function main(): Promise<void> {
  const wsServer = new WsServer();
  const port = await wsServer.start(DEFAULT_WS_PORT);
  process.stderr.write(`Improv WebSocket server listening on port ${port}\n`);

  const mcpServer = new McpServer({
    name: 'improv',
    version: '0.1.0',
  });

  registerTools(mcpServer, wsServer);

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);

  process.on('SIGINT', async () => {
    await wsServer.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  process.stderr.write(`Improv server error: ${err}\n`);
  process.exit(1);
});
