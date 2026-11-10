import { listIssuesShape, listIssuesSchema, validateInput } from "../schemas/index.js";
import { listIssues } from "../github/operations.js";
import { successResponse, errorResponse } from "../utils/response.js";
import type { ToolResponse } from "../types.js";

export const listIssuesTool = {
  name: "list_issues",
  description:
    "Lista los issues ABIERTOS de un repositorio específico de GitHub (número, título, autor y URL). " +
    "Úsalo cuando el usuario pregunte qué issues, bugs o tareas pendientes tiene un repositorio.",
  inputSchema: listIssuesShape,

  handler: async (args: unknown): Promise<ToolResponse> => {
    try {
      const input = validateInput(listIssuesSchema, args);
      const issues = await listIssues(input);
      if (issues.length === 0) {
        return successResponse(`El repositorio ${input.repo} no tiene issues abiertos.`);
      }
      return successResponse(`El repositorio ${input.repo} tiene ${issues.length} issues abiertos:`, issues);
    } catch (error) {
      return errorResponse("list_issues", error);
    }
  },
};
