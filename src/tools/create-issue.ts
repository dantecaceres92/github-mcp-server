import { createIssueShape, createIssueSchema, validateInput } from "../schemas/index.js";
import { createIssue } from "../github/operations.js";
import { successResponse, errorResponse } from "../utils/response.js";
import type { ToolResponse } from "../types.js";

export const createIssueTool = {
  name: "create_issue",
  description:
    "Abre un nuevo issue (reporte de bug, tarea o mejora) en un repositorio EXISTENTE de GitHub, con título y descripción. " +
    "Úsalo cuando el usuario pida reportar un problema, crear una tarea o abrir un issue.",
  inputSchema: createIssueShape,

  handler: async (args: unknown): Promise<ToolResponse> => {
    try {
      const input = validateInput(createIssueSchema, args);
      const issue = await createIssue(input);
      return successResponse(`Issue #${issue.number} "${issue.title}" creado correctamente. URL: ${issue.url}`, issue);
    } catch (error) {
      return errorResponse("create_issue", error);
    }
  },
};
