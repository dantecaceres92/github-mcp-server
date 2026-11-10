// Tests de operaciones de GitHub con Octokit MOCKEADO.
// vi.mock() reemplaza el módulo client.ts: getOctokit() devuelve un objeto falso
// controlado por nosotros, así nunca llamamos a la API real de GitHub.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOctokit } from "../src/github/client.js";
import {
  createRepository,
  listRepositories,
  createIssue,
  listIssues,
  createCommit,
} from "../src/github/operations.js";
import { createIssueTool } from "../src/tools/create-issue.js";
import { AuthenticationError, GitHubAPIError } from "../src/errors/index.js";

vi.mock("../src/github/client.js", () => ({
  getOctokit: vi.fn(),
}));

// Octokit falso: cada método es una función mock (vi.fn()).
const mockOctokit = {
  rest: {
    users: { getAuthenticated: vi.fn() },
    repos: {
      createForAuthenticatedUser: vi.fn(),
      listForAuthenticatedUser: vi.fn(),
      getContent: vi.fn(),
      createOrUpdateFileContents: vi.fn(),
    },
    issues: {
      create: vi.fn(),
      listForRepo: vi.fn(),
    },
  },
};

// Simula un error de Octokit (tienen una propiedad "status" con el código HTTP).
function httpError(status: number, message = "error") {
  return Object.assign(new Error(message), { status, response: { headers: {} } });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getOctokit).mockReturnValue(mockOctokit as any);
  mockOctokit.rest.users.getAuthenticated.mockResolvedValue({ data: { login: "dante" } });
});

describe("createRepository", () => {
  it("llama a la API con los parámetros correctos y devuelve un resumen", async () => {
    mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({
      data: {
        name: "mi-proyecto",
        full_name: "dante/mi-proyecto",
        description: "Demo",
        private: false,
        html_url: "https://github.com/dante/mi-proyecto",
      },
    });

    const repo = await createRepository({ name: "mi-proyecto", description: "Demo", isPrivate: false });

    expect(mockOctokit.rest.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
      name: "mi-proyecto",
      description: "Demo",
      private: false,
      auto_init: true,
    });
    expect(repo.fullName).toBe("dante/mi-proyecto");
  });

  it("transforma un 422 (repo ya existe) en GitHubAPIError", async () => {
    mockOctokit.rest.repos.createForAuthenticatedUser.mockRejectedValue(httpError(422));
    await expect(createRepository({ name: "repetido", isPrivate: false })).rejects.toThrow(GitHubAPIError);
  });
});

describe("listRepositories", () => {
  it("devuelve solo los campos útiles de cada repositorio", async () => {
    mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
      data: [
        { name: "a-repo", full_name: "dante/a-repo", description: null, private: true, html_url: "url-a", id: 1, size: 99 },
      ],
    });

    const repos = await listRepositories({ perPage: 10, sort: "updated" });
    expect(repos).toEqual([
      { name: "a-repo", fullName: "dante/a-repo", description: null, private: true, url: "url-a" },
    ]);
  });

  it("lanza AuthenticationError si el token es inválido (401)", async () => {
    mockOctokit.rest.repos.listForAuthenticatedUser.mockRejectedValue(httpError(401, "Bad credentials"));
    await expect(listRepositories({ perPage: 10, sort: "updated" })).rejects.toThrow(AuthenticationError);
  });
});

describe("createIssue / listIssues", () => {
  it("usa el usuario autenticado como owner cuando no se indica", async () => {
    mockOctokit.rest.issues.create.mockResolvedValue({
      data: { number: 7, title: "Bug", state: "open", html_url: "url", user: { login: "dante" } },
    });

    await createIssue({ repo: "mi-proyecto", title: "Bug" });
    expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "dante", repo: "mi-proyecto", title: "Bug" })
    );
  });

  it("filtra los pull requests de la lista de issues", async () => {
    mockOctokit.rest.issues.listForRepo.mockResolvedValue({
      data: [
        { number: 1, title: "Issue real", state: "open", html_url: "u1", user: { login: "a" } },
        { number: 2, title: "Soy un PR", state: "open", html_url: "u2", user: { login: "b" }, pull_request: {} },
      ],
    });

    const issues = await listIssues({ owner: "dante", repo: "mi-proyecto", perPage: 10 });
    expect(issues).toHaveLength(1);
    expect(issues[0].title).toBe("Issue real");
  });

  it("repositorio inexistente: el tool devuelve isError con mensaje en lenguaje natural", async () => {
    mockOctokit.rest.issues.create.mockRejectedValue(httpError(404, "Not Found"));

    const response = await createIssueTool.handler({ owner: "dante", repo: "no-existe", title: "Hola" });

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain(
      "El repositorio dante/no-existe no fue encontrado. Verifica el nombre e intenta de nuevo"
    );
  });
});

describe("createCommit", () => {
  it("crea un archivo nuevo (getContent da 404) enviando el contenido en base64", async () => {
    mockOctokit.rest.repos.getContent.mockRejectedValue(httpError(404));
    mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({
      data: { commit: { sha: "abc123", html_url: "commit-url" } },
    });

    const result = await createCommit({
      owner: "dante",
      repo: "mi-proyecto",
      path: "hola.txt",
      content: "Hola mundo",
      message: "agrega hola.txt",
    });

    expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({
        content: Buffer.from("Hola mundo").toString("base64"),
        sha: undefined,
      })
    );
    expect(result.action).toBe("creado");
  });

  it("modifica un archivo existente enviando su sha", async () => {
    mockOctokit.rest.repos.getContent.mockResolvedValue({ data: { sha: "sha-viejo", type: "file" } });
    mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({
      data: { commit: { sha: "nuevo", html_url: "url" } },
    });

    const result = await createCommit({
      owner: "dante",
      repo: "mi-proyecto",
      path: "README.md",
      content: "# Nuevo",
      message: "actualiza README",
    });

    expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({ sha: "sha-viejo" })
    );
    expect(result.action).toBe("modificado");
  });
});
