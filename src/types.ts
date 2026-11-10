// Tipos compartidos del proyecto.
// Representan "nuestra versión" de los datos de GitHub: solo los campos que
// le sirven al LLM, en lugar de devolver la respuesta gigante de la API.

export interface RepositorySummary {
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  url: string;
}

export interface IssueSummary {
  number: number;
  title: string;
  state: string;
  url: string;
  author: string;
}

export interface CommitResult {
  sha: string;
  message: string;
  url: string;
  path: string;
  action: "creado" | "modificado";
}

export interface CommitSummary {
  sha: string;
  message: string;
  author: string;
  date: string;
}

// Formato de respuesta que espera el SDK de MCP para un tool.
// "content" es una lista de bloques; nosotros siempre devolvemos texto.
export interface ToolResponse {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  isError?: boolean;
}
