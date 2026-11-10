// Extra credit
import { listCommitsShape, listCommitsSchema, validateInput } from "../schemas/index.js";
import { listCommits } from "../github/operations.js";
import { successResponse, errorResponse } from "../utils/response.js";
import type { ToolResponse } from "../types.js";

export const listCommitsTool = {
  name: "list_commits",
  description:
    "Lista los commits más recientes de un repositorio de GitHub (sha corto, mensaje, autor y fecha). " +
    "Úsalo cuando el usuario quiera ver el historial o los últimos cambios de un repositorio.",
  inputSchema: listCommitsShape,

  handler: async (args: unknown): Promise<ToolResponse> => {
    try {
      const input = validateInput(listCommitsSchema, args);
      const commits = await listCommits(input);
      return successResponse(`Últimos ${commits.length} commits de ${input.repo}:`, commits);
    } catch (error) {
      return errorResponse("list_commits", error);
    }
  },
};
