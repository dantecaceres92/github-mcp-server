// Tests de validación de schemas (Zod).
// Verifican que los inputs válidos pasan y los inválidos fallan con mensajes claros.
import { describe, it, expect } from "vitest";
import {
  createRepositorySchema,
  createIssueSchema,
  createCommitSchema,
  listRepositoriesSchema,
  validateInput,
} from "../src/schemas/index.js";
import { ValidationError } from "../src/errors/index.js";

describe("Schema create_repository", () => {
  it("acepta un nombre válido y aplica isPrivate=false por defecto", () => {
    const result = createRepositorySchema.parse({ name: "mi-proyecto", description: "Demo" });
    expect(result.name).toBe("mi-proyecto");
    expect(result.isPrivate).toBe(false);
  });

  it("rechaza nombres de menos de 3 caracteres", () => {
    const result = createRepositorySchema.safeParse({ name: "ab" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("El nombre del repositorio debe tener al menos 3 caracteres");
    }
  });

  it("rechaza nombres de más de 100 caracteres", () => {
    const result = createRepositorySchema.safeParse({ name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rechaza nombres con espacios o caracteres especiales", () => {
    expect(createRepositorySchema.safeParse({ name: "mi proyecto" }).success).toBe(false);
    expect(createRepositorySchema.safeParse({ name: "proyecto@2026!" }).success).toBe(false);
  });
});

describe("Schema create_issue", () => {
  it("acepta un issue válido sin owner (es opcional)", () => {
    const result = createIssueSchema.safeParse({ repo: "mi-proyecto", title: "Bug en login" });
    expect(result.success).toBe(true);
  });

  it("rechaza un issue con título vacío", () => {
    const result = createIssueSchema.safeParse({ repo: "mi-proyecto", title: "" });
    expect(result.success).toBe(false);
  });
});

describe("Schema create_commit", () => {
  it("rechaza rutas que empiezan con '/' o contienen '..'", () => {
    const base = { repo: "mi-proyecto", content: "hola", message: "test" };
    expect(createCommitSchema.safeParse({ ...base, path: "/README.md" }).success).toBe(false);
    expect(createCommitSchema.safeParse({ ...base, path: "../secreto.txt" }).success).toBe(false);
    expect(createCommitSchema.safeParse({ ...base, path: "docs/notas.md" }).success).toBe(true);
  });
});

describe("Schema list_repositories", () => {
  it("aplica valores por defecto y rechaza perPage fuera de rango", () => {
    expect(listRepositoriesSchema.parse({})).toEqual({ perPage: 10, sort: "updated" });
    expect(listRepositoriesSchema.safeParse({ perPage: 500 }).success).toBe(false);
  });
});

describe("validateInput", () => {
  it("lanza ValidationError con el campo y un mensaje claro", () => {
    expect(() => validateInput(createRepositorySchema, { name: "ab" })).toThrow(ValidationError);
    expect(() => validateInput(createRepositorySchema, { name: "ab" })).toThrow(
      "name: El nombre del repositorio debe tener al menos 3 caracteres"
    );
  });
});
