// Errores custom del proyecto.
// Idea central: cada error ya trae un mensaje en lenguaje natural que el LLM
// puede repetirle al usuario. Nunca devolvemos stack traces.

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

// El usuario (o el LLM) mandó parámetros inválidos.
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// El token falta, es inválido o no tiene permisos (401 / 403).
export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

// GitHub respondió con un error (404, 422, rate limit, 500...).
export class GitHubAPIError extends AppError {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubAPIError";
    this.status = status;
  }
}

// No hay conexión con GitHub (sin internet, DNS, timeout).
export class NetworkError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

// Contexto opcional para armar mensajes más claros ("el repositorio X...").
export interface ErrorContext {
  owner?: string;
  repo?: string;
  issueNumber?: number;
}

const NETWORK_CODES = ["ENOTFOUND", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"];

// Detecta si un error es de red (no llegamos a hablar con GitHub).
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  if (NETWORK_CODES.includes(error.code)) return true;
  if (error.cause && NETWORK_CODES.includes(error.cause.code)) return true;
  const message = String(error.message ?? "").toLowerCase();
  return message.includes("fetch failed") || message.includes("network");
}

// Detecta si GitHub nos frenó por rate limit.
// GitHub usa 429, o 403 con el header x-ratelimit-remaining en "0".
export function isRateLimitError(error: any): boolean {
  if (!error) return false;
  if (error.status === 429) return true;
  const remaining = error.response?.headers?.["x-ratelimit-remaining"];
  return error.status === 403 && remaining === "0";
}

// Transforma cualquier error técnico (de Octokit, de red, etc.)
// en uno de nuestros errores custom con mensaje en lenguaje natural.
export function handleGitHubError(error: any, context: ErrorContext = {}): AppError {
  // Si ya es uno de los nuestros, no lo tocamos.
  if (error instanceof AppError) return error;

  const repoName = context.owner && context.repo ? `${context.owner}/${context.repo}` : context.repo;

  if (isNetworkError(error)) {
    return new NetworkError(
      "No se pudo conectar con GitHub. Verifica tu conexión a internet e intenta de nuevo."
    );
  }

  if (isRateLimitError(error)) {
    return new GitHubAPIError(
      "Se alcanzó el límite de solicitudes de la API de GitHub (rate limit). Espera unos minutos e intenta de nuevo.",
      error.status
    );
  }

  switch (error?.status) {
    case 401:
      return new AuthenticationError(
        "El token de GitHub es inválido o expiró. Genera un nuevo Personal Access Token y actualiza la variable GITHUB_TOKEN."
      );
    case 403:
      return new AuthenticationError(
        "El token de GitHub no tiene permisos para esta operación. Verifica que tenga los scopes 'repo', 'user' y 'admin:org'."
      );
    case 404:
      if (context.issueNumber && repoName) {
        return new GitHubAPIError(
          `El issue #${context.issueNumber} no fue encontrado en el repositorio ${repoName}. Verifica el número e intenta de nuevo.`,
          404
        );
      }
      if (repoName) {
        return new GitHubAPIError(
          `El repositorio ${repoName} no fue encontrado. Verifica el nombre e intenta de nuevo.`,
          404
        );
      }
      return new GitHubAPIError("El recurso solicitado no fue encontrado en GitHub.", 404);
    case 409:
      return new GitHubAPIError(
        "Hubo un conflicto en el repositorio (por ejemplo, el repositorio está vacío o el archivo cambió). Intenta de nuevo.",
        409
      );
    case 422:
      return new GitHubAPIError(
        `GitHub rechazó los datos enviados${repoName ? ` para ${repoName}` : ""}. Puede que el recurso ya exista o que algún dato sea inválido.`,
        422
      );
    default:
      if (error?.status && error.status >= 500) {
        return new GitHubAPIError(
          "GitHub está teniendo problemas en este momento. Intenta de nuevo en unos minutos.",
          error.status
        );
      }
      return new AppError("Ocurrió un error inesperado al comunicarse con GitHub.");
  }
}

// Devuelve el texto final que verá el LLM.
export function formatErrorForLLM(error: unknown): string {
  if (error instanceof AppError) {
    return `Error (${error.name}): ${error.message}`;
  }
  return "Error: ocurrió un error inesperado. Revisa los logs del servidor para más detalles.";
}
