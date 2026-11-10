// Tests de transformación de errores, retry logic y logging seguro.
import { describe, it, expect, vi } from "vitest";
import {
  handleGitHubError,
  formatErrorForLLM,
  AuthenticationError,
  GitHubAPIError,
  NetworkError,
  ValidationError,
} from "../src/errors/index.js";
import { withRetry } from "../src/utils/retry.js";
import { sanitize } from "../src/utils/logging.js";

describe("handleGitHubError", () => {
  it("404 con repo -> mensaje 'El repositorio X no fue encontrado'", () => {
    const error = handleGitHubError({ status: 404 }, { owner: "dante", repo: "fantasma" });
    expect(error).toBeInstanceOf(GitHubAPIError);
    expect(error.message).toBe("El repositorio dante/fantasma no fue encontrado. Verifica el nombre e intenta de nuevo.");
  });

  it("401 -> AuthenticationError que menciona GITHUB_TOKEN", () => {
    const error = handleGitHubError({ status: 401 });
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toContain("GITHUB_TOKEN");
  });

  it("403 con x-ratelimit-remaining=0 -> rate limit (no lo confunde con falta de permisos)", () => {
    const error = handleGitHubError({ status: 403, response: { headers: { "x-ratelimit-remaining": "0" } } });
    expect(error).toBeInstanceOf(GitHubAPIError);
    expect(error.message).toContain("límite de solicitudes");
  });

  it("error de conexión (ENOTFOUND) -> NetworkError", () => {
    const error = handleGitHubError({ code: "ENOTFOUND", message: "getaddrinfo ENOTFOUND api.github.com" });
    expect(error).toBeInstanceOf(NetworkError);
  });
});

describe("formatErrorForLLM", () => {
  it("devuelve un texto legible, sin stack trace", () => {
    const text = formatErrorForLLM(new ValidationError("name: muy corto"));
    expect(text).toBe("Error (ValidationError): name: muy corto");
    expect(text).not.toContain("at ");
  });
});

describe("withRetry (exponential backoff)", () => {
  it("reintenta ante rate limit (429) y termina devolviendo el resultado", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 429 })
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce("ok");

    const result = await withRetry(fn, 3, 1); // baseDelay de 1 ms para que el test sea rápido
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("NO reintenta errores que no son temporales (404)", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 404 });
    await expect(withRetry(fn, 3, 1)).rejects.toEqual({ status: 404 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("se rinde después de maxRetries", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 429 });
    await expect(withRetry(fn, 2, 1)).rejects.toEqual({ status: 429 });
    expect(fn).toHaveBeenCalledTimes(3); // 1 intento + 2 reintentos
  });
});

describe("sanitize (logs sin datos sensibles)", () => {
  it("oculta tokens de GitHub", () => {
    const text = sanitize("token usado: ghp_ABC123xyz456");
    expect(text).toBe("token usado: ghp_***");
  });
});
