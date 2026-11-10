// Logger del servidor.
// MUY IMPORTANTE: el MCP server se comunica por stdio. stdout está reservado
// para los mensajes JSON-RPC del protocolo. Si hacemos console.log, ese texto
// se mezcla con el protocolo y rompe la comunicación con el host.
// Por eso todos los logs van a stderr (console.error).

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function currentLevel(): number {
  const level = (process.env.LOG_LEVEL ?? "info") as LogLevel;
  return LEVELS[level] ?? LEVELS.info;
}

// Oculta tokens de GitHub para que nunca aparezcan en los logs.
// Los tokens clásicos empiezan con "ghp_" y los fine-grained con "github_pat_".
export function sanitize(text: string): string {
  let result = text.replace(/(ghp_|gho_|ghs_|github_pat_)[A-Za-z0-9_]+/g, "$1***");
  const token = process.env.GITHUB_TOKEN;
  if (token && token.length > 4) {
    result = result.split(token).join("***");
  }
  return result;
}

function write(level: LogLevel, message: string, data?: unknown): void {
  if (LEVELS[level] < currentLevel()) return;
  const time = new Date().toISOString();
  let line = `[${time}] [${level.toUpperCase()}] ${message}`;
  if (data !== undefined) {
    line += " " + (typeof data === "string" ? data : JSON.stringify(data));
  }
  console.error(sanitize(line));
}

export const logger = {
  debug: (message: string, data?: unknown) => write("debug", message, data),
  info: (message: string, data?: unknown) => write("info", message, data),
  warn: (message: string, data?: unknown) => write("warn", message, data),
  error: (message: string, data?: unknown) => write("error", message, data),
};
