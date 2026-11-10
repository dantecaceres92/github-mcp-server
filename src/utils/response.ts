// Helpers para armar la respuesta que el MCP server le devuelve al LLM.

import { formatErrorForLLM } from "../errors/index.js";
import { logger } from "./logging.js";
import type { ToolResponse } from "../types.js";

// Respuesta exitosa: un mensaje + (opcional) los datos en JSON legible.
export function successResponse(message: string, data?: unknown): ToolResponse {
  const text = data === undefined ? message : `${message}\n\n${JSON.stringify(data, null, 2)}`;
  return { content: [{ type: "text", text }] };
}

// Respuesta de error: isError = true le avisa al LLM que la acción falló,
// y el texto ya está en lenguaje natural para que se lo explique al usuario.
export function errorResponse(toolName: string, error: unknown): ToolResponse {
  logger.error(`Falló el tool ${toolName}`, error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  return {
    content: [{ type: "text", text: formatErrorForLLM(error) }],
    isError: true,
  };
}
