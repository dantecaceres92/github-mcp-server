// Extra credit
import { closeIssueShape, closeIssueSchema, validateInput } from "../schemas/index.js";
import { closeIssue } from "../github/operations.js";
import { successResponse, errorResponse } from "../utils/response.js";
import type { ToolResponse } from "../types.js";

export const closeIssueTool = {
  name: "close_issue",
  description:
    "Cierra un issue abierto de un repositorio de GitHub a partir de su número. " +
    "Úsalo cuando el usuario diga que un issue está resuelto o pida cerrarlo.",
  inputSchema: closeIssueShape,

  handler: async (args: unknown): Promise<ToolResponse> => {
    try {
      const input = validateInput(closeIssueSchema, args);
      const issue = await closeIssue(input);
      return successResponse(`Issue #${issue.number} "${issue.title}" cerrado correctamente.`, issue);
    } catch (error) {
      return errorResponse("close_issue", error);
    }
  },
};
