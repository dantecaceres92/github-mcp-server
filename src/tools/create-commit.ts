import { createCommitShape, createCommitSchema, validateInput } from "../schemas/index.js";
import { createCommit } from "../github/operations.js";
import { successResponse, errorResponse } from "../utils/response.js";
import type { ToolResponse } from "../types.js";

export const createCommitTool = {
  name: "create_commit",
  description:
    "Hace un commit en un repositorio EXISTENTE de GitHub creando un archivo nuevo o reemplazando el contenido de uno existente. " +
    "Úsalo cuando el usuario pida agregar, crear, modificar o actualizar un archivo en un repositorio. " +
    "El parámetro 'content' debe ser el contenido COMPLETO del archivo.",
  inputSchema: createCommitShape,

  handler: async (args: unknown): Promise<ToolResponse> => {
    try {
      const input = validateInput(createCommitSchema, args);
      const commit = await createCommit(input);
      return successResponse(
        `Commit realizado: archivo "${commit.path}" ${commit.action} con el mensaje "${commit.message}". URL: ${commit.url}`,
        commit
      );
    } catch (error) {
      return errorResponse("create_commit", error);
    }
  },
};
