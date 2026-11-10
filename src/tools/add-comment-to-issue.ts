// Extra credit
import { addCommentShape, addCommentSchema, validateInput } from "../schemas/index.js";
import { addCommentToIssue } from "../github/operations.js";
import { successResponse, errorResponse } from "../utils/response.js";
import type { ToolResponse } from "../types.js";

export const addCommentToIssueTool = {
  name: "add_comment_to_issue",
  description:
    "Agrega un comentario a un issue existente de un repositorio de GitHub. " +
    "Úsalo cuando el usuario pida comentar, responder o dejar una nota en un issue.",
  inputSchema: addCommentShape,

  handler: async (args: unknown): Promise<ToolResponse> => {
    try {
      const input = validateInput(addCommentSchema, args);
      const comment = await addCommentToIssue(input);
      return successResponse(`Comentario agregado al issue #${input.issueNumber}. URL: ${comment.url}`, comment);
    } catch (error) {
      return errorResponse("add_comment_to_issue", error);
    }
  },
};
