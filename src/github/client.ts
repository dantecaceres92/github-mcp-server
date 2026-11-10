// Configuración del cliente de GitHub (Octokit).
// Este archivo SOLO crea el cliente. La lógica de negocio está en operations.ts.
// Separarlos nos permite reemplazar (mockear) este archivo en los tests
// y probar operations.ts sin llamar a la API real.

import { Octokit } from "@octokit/rest";
import { AuthenticationError } from "../errors/index.js";

let octokit: Octokit | null = null;

export function getOctokit(): Octokit {
  // Patrón "singleton": creamos el cliente una sola vez y lo reutilizamos.
  if (octokit) return octokit;

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new AuthenticationError(
      "No se encontró la variable de entorno GITHUB_TOKEN. Crea un archivo .env basado en .env.example con tu Personal Access Token."
    );
  }

  octokit = new Octokit({
    auth: token,
    userAgent: "github-mcp-server/1.0.0",
  });

  return octokit;
}
