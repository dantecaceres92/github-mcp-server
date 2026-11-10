// Lista de todos los tools. server.ts recorre esta lista y los registra.
import { createRepositoryTool } from "./create-repository.js";
import { listRepositoriesTool } from "./list-repositories.js";
import { createIssueTool } from "./create-issue.js";
import { listIssuesTool } from "./list-issues.js";
import { createCommitTool } from "./create-commit.js";
import { listCommitsTool } from "./list-commits.js";
import { closeIssueTool } from "./close-issue.js";
import { addCommentToIssueTool } from "./add-comment-to-issue.js";

export const allTools = [
  // Obligatorios
  createRepositoryTool,
  listRepositoriesTool,
  createIssueTool,
  listIssuesTool,
  createCommitTool,
  // Extra credit
  listCommitsTool,
  closeIssueTool,
  addCommentToIssueTool,
];
