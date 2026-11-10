import { listRepositoriesShape, listRepositoriesSchema, validateInput } from "../schemas/index.js";
import { listRepositories } from "../github/operations.js";
import { successResponse, errorResponse } from "../utils/response.js";
import type { ToolResponse } from "../types.js";

export const listRepositoriesTool = {
  name: "list_repositories",
  description:
    "Lista los repositorios del usuario autenticado en GitHub (nombre, descripción, visibilidad y URL). " +
    "Úsalo cuando el usuario pregunte qué repositorios tiene, o para averiguar el nombre exacto de un repo antes de usar otro tool.",
  inputSchema: listRepositoriesShape,

  handler: async (args: unknown): Promise<ToolResponse> => {
    try {
      const input = validateInput(listRepositoriesSchema, args);
      const repos = await listRepositories(input);
      if (repos.length === 0) {
        return successResponse("El usuario no tiene repositorios.");
      }
      return successResponse(`Se encontraron ${repos.length} repositorios:`, repos);
    } catch (error) {
      return errorResponse("list_repositories", error);
    }
  },
};
