// Entry point del MCP Server.
// 1. Carga las variables de entorno (.env)
// 2. Crea el servidor MCP
// 3. Registra los tools
// 4. Se conecta por stdio (stdin/stdout) con el host (VS Code)

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { allTools } from "./tools/index.js";
import { logger } from "./utils/logging.js";

// Cargamos el .env desde la raíz del proyecto, sin importar desde qué carpeta
// lo lance VS Code. "quiet: true" evita que dotenv escriba en stdout.
const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, "../.env"), quiet: true });

const server = new McpServer({
  name: "github-mcp-server",
  version: "1.0.0",
});

for (const tool of allTools) {
  server.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.inputSchema,
    },
    tool.handler
  );
  logger.debug(`Tool registrado: ${tool.name}`);
}

async function main() {
  if (!process.env.GITHUB_TOKEN) {
    logger.warn("GITHUB_TOKEN no está definido. Los tools van a responder con un error de autenticación.");
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info(`GitHub MCP Server iniciado por stdio con ${allTools.length} tools`);
}

main().catch((error) => {
  logger.error("Error fatal al iniciar el servidor", String(error));
  process.exit(1);
});
