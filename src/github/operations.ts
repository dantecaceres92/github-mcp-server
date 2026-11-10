// Operaciones de GitHub: acá vive la lógica de negocio.
// Cada función:
//   1. Obtiene el cliente con getOctokit()
//   2. Llama a la API envuelta en withRetry() (reintenta si hay rate limit)
//   3. Devuelve solo los datos útiles (tipos de types.ts)
//   4. Si algo falla, transforma el error con handleGitHubError()

import { getOctokit } from "./client.js";
import { handleGitHubError } from "../errors/index.js";
import { withRetry } from "../utils/retry.js";
import { logger } from "../utils/logging.js";
import type {
  CommitResult,
  CommitSummary,
  IssueSummary,
  RepositorySummary,
} from "../types.js";

// Devuelve el usuario dueño del token (ej: "dantecaceres").
export async function getAuthenticatedUsername(): Promise<string> {
  try {
    const octokit = getOctokit();
    const { data } = await withRetry(() => octokit.rest.users.getAuthenticated());
    return data.login;
  } catch (error) {
    throw handleGitHubError(error);
  }
}

// Si el LLM no indicó el owner, usamos el usuario autenticado.
async function resolveOwner(owner?: string): Promise<string> {
  return owner ?? (await getAuthenticatedUsername());
}

export async function createRepository(params: {
  name: string;
  description?: string;
  isPrivate: boolean;
}): Promise<RepositorySummary> {
  try {
    const octokit = getOctokit();
    logger.info(`Creando repositorio ${params.name}`);
    const { data } = await withRetry(() =>
      octokit.rest.repos.createForAuthenticatedUser({
        name: params.name,
        description: params.description,
        private: params.isPrivate,
        auto_init: true, // crea un README inicial, así se puede commitear enseguida
      })
    );
    return {
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      private: data.private,
      url: data.html_url,
    };
  } catch (error) {
    throw handleGitHubError(error, { repo: params.name });
  }
}

export async function listRepositories(params: {
  perPage: number;
  sort: "created" | "updated" | "pushed" | "full_name";
}): Promise<RepositorySummary[]> {
  try {
    const octokit = getOctokit();
    const { data } = await withRetry(() =>
      octokit.rest.repos.listForAuthenticatedUser({
        per_page: params.perPage,
        sort: params.sort,
      })
    );
    return data.map((repo) => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      url: repo.html_url,
    }));
  } catch (error) {
    throw handleGitHubError(error);
  }
}

export async function createIssue(params: {
  owner?: string;
  repo: string;
  title: string;
  body?: string;
}): Promise<IssueSummary> {
  const owner = await resolveOwner(params.owner);
  try {
    const octokit = getOctokit();
    logger.info(`Creando issue en ${owner}/${params.repo}`);
    const { data } = await withRetry(() =>
      octokit.rest.issues.create({
        owner,
        repo: params.repo,
        title: params.title,
        body: params.body,
      })
    );
    return {
      number: data.number,
      title: data.title,
      state: data.state,
      url: data.html_url,
      author: data.user?.login ?? "desconocido",
    };
  } catch (error) {
    throw handleGitHubError(error, { owner, repo: params.repo });
  }
}

export async function listIssues(params: {
  owner?: string;
  repo: string;
  perPage: number;
}): Promise<IssueSummary[]> {
  const owner = await resolveOwner(params.owner);
  try {
    const octokit = getOctokit();
    const { data } = await withRetry(() =>
      octokit.rest.issues.listForRepo({
        owner,
        repo: params.repo,
        state: "open",
        per_page: params.perPage,
      })
    );
    // La API de issues también devuelve Pull Requests: los filtramos.
    return data
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        url: issue.html_url,
        author: issue.user?.login ?? "desconocido",
      }));
  } catch (error) {
    throw handleGitHubError(error, { owner, repo: params.repo });
  }
}

export async function createCommit(params: {
  owner?: string;
  repo: string;
  path: string;
  content: string;
  message: string;
  branch?: string;
}): Promise<CommitResult> {
  const owner = await resolveOwner(params.owner);
  try {
    const octokit = getOctokit();

    // 1. ¿El archivo ya existe? Si existe, GitHub nos exige su "sha" para modificarlo.
    let sha: string | undefined;
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo: params.repo,
        path: params.path,
        ref: params.branch,
      });
      if (!Array.isArray(data) && "sha" in data) {
        sha = data.sha;
      }
    } catch (error: any) {
      // 404 acá significa "el archivo no existe todavía": está bien, lo creamos.
      if (error?.status !== 404) throw error;
    }

    // 2. Creamos o actualizamos el archivo. GitHub pide el contenido en base64.
    logger.info(`Commit en ${owner}/${params.repo}: ${params.path}`);
    const { data } = await withRetry(() =>
      octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo: params.repo,
        path: params.path,
        message: params.message,
        content: Buffer.from(params.content, "utf-8").toString("base64"),
        sha,
        branch: params.branch,
      })
    );

    return {
      sha: data.commit.sha ?? "",
      message: params.message,
      url: data.commit.html_url ?? "",
      path: params.path,
      action: sha ? "modificado" : "creado",
    };
  } catch (error) {
    throw handleGitHubError(error, { owner, repo: params.repo });
  }
}

// ---------- Extra credit ----------

export async function listCommits(params: {
  owner?: string;
  repo: string;
  perPage: number;
}): Promise<CommitSummary[]> {
  const owner = await resolveOwner(params.owner);
  try {
    const octokit = getOctokit();
    const { data } = await withRetry(() =>
      octokit.rest.repos.listCommits({
        owner,
        repo: params.repo,
        per_page: params.perPage,
      })
    );
    return data.map((commit) => ({
      sha: commit.sha.substring(0, 7),
      message: commit.commit.message,
      author: commit.commit.author?.name ?? "desconocido",
      date: commit.commit.author?.date ?? "",
    }));
  } catch (error) {
    throw handleGitHubError(error, { owner, repo: params.repo });
  }
}

export async function closeIssue(params: {
  owner?: string;
  repo: string;
  issueNumber: number;
}): Promise<IssueSummary> {
  const owner = await resolveOwner(params.owner);
  try {
    const octokit = getOctokit();
    const { data } = await withRetry(() =>
      octokit.rest.issues.update({
        owner,
        repo: params.repo,
        issue_number: params.issueNumber,
        state: "closed",
      })
    );
    return {
      number: data.number,
      title: data.title,
      state: data.state,
      url: data.html_url,
      author: data.user?.login ?? "desconocido",
    };
  } catch (error) {
    throw handleGitHubError(error, { owner, repo: params.repo, issueNumber: params.issueNumber });
  }
}

export async function addCommentToIssue(params: {
  owner?: string;
  repo: string;
  issueNumber: number;
  body: string;
}): Promise<{ id: number; url: string }> {
  const owner = await resolveOwner(params.owner);
  try {
    const octokit = getOctokit();
    const { data } = await withRetry(() =>
      octokit.rest.issues.createComment({
        owner,
        repo: params.repo,
        issue_number: params.issueNumber,
        body: params.body,
      })
    );
    return { id: data.id, url: data.html_url };
  } catch (error) {
    throw handleGitHubError(error, { owner, repo: params.repo, issueNumber: params.issueNumber });
  }
}
