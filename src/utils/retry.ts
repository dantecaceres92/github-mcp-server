// Retry con exponential backoff.
// Si GitHub nos frena por rate limit (o hay un corte de red), no tiene sentido
// reintentar al instante: empeoraríamos el problema. Esperamos cada vez más:
// 1s, 2s, 4s... (baseDelayMs * 2^intento).
// Otros errores (404, 401, 422) NO se reintentan: reintentar no los arregla.

import { isNetworkError, isRateLimitError } from "../errors/index.js";
import { logger } from "./logging.js";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Decide si vale la pena reintentar según el tipo de error.
export function shouldRetry(error: unknown): boolean {
  return isRateLimitError(error) || isNetworkError(error);
}

// <T> es un generic: withRetry devuelve lo mismo que devuelve la función "fn".
// Si fn devuelve Promise<Repositorio>, withRetry también devuelve Promise<Repositorio>.
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (!shouldRetry(error) || attempt >= maxRetries) {
        throw error;
      }
      const delay = baseDelayMs * 2 ** attempt;
      attempt++;
      logger.warn(`Error temporal con GitHub. Reintento ${attempt}/${maxRetries} en ${delay} ms`);
      await sleep(delay);
    }
  }
}
