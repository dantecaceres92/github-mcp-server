// Schemas de Zod para cada tool.
// Cumplen dos funciones:
//   1. VALIDAR los inputs antes de llamar a GitHub (evitamos errores en la API).
//   2. DOCUMENTAR para el LLM qué parámetros espera cada tool (.describe()).
//      El SDK de MCP convierte estos schemas a JSON Schema y se los pasa al LLM.

import { z } from "zod";
import { ValidationError } from "../errors/index.js";

// ---------- Schemas reutilizables ----------

// Reglas de nombres de repositorio: 3 a 100 caracteres,
// solo letras, números, guiones (-), guiones bajos (_) y puntos (.).
export const repoNameSchema = z
  .string({ required_error: "El nombre del repositorio es obligatorio" })
  .min(3, "El nombre del repositorio debe tener al menos 3 caracteres")
  .max(100, "El nombre del repositorio no puede tener más de 100 caracteres")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "El nombre del repositorio solo puede contener letras, números, guiones (-), guiones bajos (_) y puntos (.). No se permiten espacios."
  );

// Usuario u organización dueña del repo (reglas de GitHub: máx. 39 caracteres,
// letras, números y guiones; no puede empezar ni terminar con guion).
export const ownerSchema = z
  .string()
  .min(1, "El owner no puede estar vacío")
  .max(39, "El owner no puede tener más de 39 caracteres")
  .regex(
    /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
    "El owner solo puede contener letras, números y guiones, y no puede empezar ni terminar con guion"
  );

const perPageSchema = z
  .number()
  .int("La cantidad debe ser un número entero")
  .min(1, "La cantidad mínima es 1")
  .max(100, "La cantidad máxima es 100");

const issueNumberSchema = z
  .number({ required_error: "El número de issue es obligatorio" })
  .int("El número de issue debe ser un entero")
  .positive("El número de issue debe ser mayor a 0");

// ---------- Schemas de cada tool ----------
// Exportamos el "shape" (objeto con los campos) porque registerTool del SDK
// lo recibe así, y también el z.object() completo para validar y testear.

export const createRepositoryShape = {
  name: repoNameSchema.describe("Nombre del nuevo repositorio, sin espacios. Ej: 'mi-proyecto-api'"),
  description: z
    .string()
    .max(350, "La descripción no puede superar los 350 caracteres")
    .optional()
    .describe("Descripción corta del repositorio"),
  isPrivate: z
    .boolean()
    .default(false)
    .describe("true para crear un repositorio privado. Por defecto es público (false)"),
};
export const createRepositorySchema = z.object(createRepositoryShape);

export const listRepositoriesShape = {
  perPage: perPageSchema.default(10).describe("Cantidad de repositorios a listar (1-100). Por defecto 10"),
  sort: z
    .enum(["created", "updated", "pushed", "full_name"])
    .default("updated")
    .describe("Criterio de orden: created, updated, pushed o full_name. Por defecto 'updated'"),
};
export const listRepositoriesSchema = z.object(listRepositoriesShape);

export const createIssueShape = {
  owner: ownerSchema
    .optional()
    .describe("Usuario u organización dueña del repositorio. Si se omite, se usa el usuario autenticado"),
  repo: repoNameSchema.describe("Nombre del repositorio donde se abrirá el issue"),
  title: z
    .string({ required_error: "El título del issue es obligatorio" })
    .min(1, "El título del issue no puede estar vacío")
    .max(256, "El título del issue no puede superar los 256 caracteres")
    .describe("Título del issue"),
  body: z.string().optional().describe("Descripción detallada del issue (acepta Markdown)"),
};
export const createIssueSchema = z.object(createIssueShape);

export const listIssuesShape = {
  owner: ownerSchema
    .optional()
    .describe("Usuario u organización dueña del repositorio. Si se omite, se usa el usuario autenticado"),
  repo: repoNameSchema.describe("Nombre del repositorio del que se listarán los issues abiertos"),
  perPage: perPageSchema.default(10).describe("Cantidad máxima de issues a listar (1-100). Por defecto 10"),
};
export const listIssuesSchema = z.object(listIssuesShape);

export const createCommitShape = {
  owner: ownerSchema
    .optional()
    .describe("Usuario u organización dueña del repositorio. Si se omite, se usa el usuario autenticado"),
  repo: repoNameSchema.describe("Nombre del repositorio donde se hará el commit"),
  path: z
    .string({ required_error: "La ruta del archivo es obligatoria" })
    .min(1, "La ruta del archivo no puede estar vacía")
    .refine((p) => !p.startsWith("/"), "La ruta no debe empezar con '/'. Ej: 'docs/notas.md'")
    .refine((p) => !p.includes(".."), "La ruta no puede contener '..'")
    .describe("Ruta del archivo dentro del repo. Ej: 'README.md' o 'src/index.js'"),
  content: z.string({ required_error: "El contenido del archivo es obligatorio" }).describe("Contenido completo del archivo (texto plano)"),
  message: z
    .string({ required_error: "El mensaje del commit es obligatorio" })
    .min(1, "El mensaje del commit no puede estar vacío")
    .describe("Mensaje del commit. Ej: 'docs: agrega guía de instalación'"),
  branch: z.string().optional().describe("Rama donde hacer el commit. Si se omite, se usa la rama por defecto"),
};
export const createCommitSchema = z.object(createCommitShape);

// ---------- Extra credit ----------

export const listCommitsShape = {
  owner: ownerSchema.optional().describe("Usuario u organización dueña del repositorio. Si se omite, se usa el usuario autenticado"),
  repo: repoNameSchema.describe("Nombre del repositorio"),
  perPage: perPageSchema.default(10).describe("Cantidad de commits recientes a listar (1-100). Por defecto 10"),
};
export const listCommitsSchema = z.object(listCommitsShape);

export const closeIssueShape = {
  owner: ownerSchema.optional().describe("Usuario u organización dueña del repositorio. Si se omite, se usa el usuario autenticado"),
  repo: repoNameSchema.describe("Nombre del repositorio"),
  issueNumber: issueNumberSchema.describe("Número del issue a cerrar (ej: 3 para el issue #3)"),
};
export const closeIssueSchema = z.object(closeIssueShape);

export const addCommentShape = {
  owner: ownerSchema.optional().describe("Usuario u organización dueña del repositorio. Si se omite, se usa el usuario autenticado"),
  repo: repoNameSchema.describe("Nombre del repositorio"),
  issueNumber: issueNumberSchema.describe("Número del issue a comentar"),
  body: z
    .string({ required_error: "El comentario es obligatorio" })
    .min(1, "El comentario no puede estar vacío")
    .describe("Texto del comentario (acepta Markdown)"),
};
export const addCommentSchema = z.object(addCommentShape);

// ---------- Helper de validación ----------

// Valida "input" con el schema. Si falla, lanza un ValidationError con
// mensajes claros, por ejemplo: "name: El nombre del repositorio debe tener al menos 3 caracteres".
export function validateInput<T>(schema: z.ZodType<T, any, any>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => {
      const field = issue.path.join(".");
      return field ? `${field}: ${issue.message}` : issue.message;
    });
    throw new ValidationError(`Parámetros inválidos. ${messages.join(". ")}`);
  }
  return result.data;
}
