import { createRepositoryShape, createRepositorySchema, validateInput } from "../schemas/index.js";
import { createRepository } from "../github/operations.js";
import { successResponse, errorResponse } from "../utils/response.js";
import type { ToolResponse } from "../types.js";

export const createRepositoryTool = {
  name: "create_repository",
  description:
    "Crea un NUEVO repositorio de GitHub en la cuenta del usuario autenticado. " +
    "Úsalo cuando el usuario pida crear, iniciar o armar un repositorio nuevo. " +
    "El repositorio se crea con un README inicial.",
  inputSchema: createRepositoryShape,

  handler: async (args: unknown): Promise<ToolResponse> => {
    try {
      const input = validateInput(createRepositorySchema, args);
      const repo = await createRepository(input);
      return successResponse(
        `Repositorio "${repo.fullName}" creado correctamente (${repo.private ? "privado" : "público"}). URL: ${repo.url}`,
        repo
      );
    } catch (error) {
      return errorResponse("create_repository", error);
    }
  },
};
