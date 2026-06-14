/**
 * Persistence for a session. Disk is the single source of truth so that every
 * MCP tool call is independent and stateless — the session survives restarts,
 * crashes, and even switching editors mid-task.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import type { Session } from "./types.js";

const NBC_DIR = ".nbc";
const SESSION_FILE = "session.json";
const ARCHIVE_DIR = "archive";

/** Root of the project being mentored. Override with NBC_PROJECT_ROOT. */
export function projectRoot(): string {
  const fromEnv = process.env.NBC_PROJECT_ROOT;
  return fromEnv ? resolve(fromEnv) : process.cwd();
}

export function sessionPath(root: string = projectRoot()): string {
  return join(root, NBC_DIR, SESSION_FILE);
}

/** Resolve a developer-supplied path against the project root. */
export function resolveInRoot(path: string, root: string = projectRoot()): string {
  return isAbsolute(path) ? path : resolve(root, path);
}

export function loadSession(root: string = projectRoot()): Session | null {
  const path = sessionPath(root);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as Session;
}

/** Write atomically via a temp file + rename so a crash can't corrupt state. */
export function saveSession(session: Session, root: string = projectRoot()): void {
  const path = sessionPath(root);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(session, null, 2), "utf8");
  renameSync(tmp, path);
}

/** Move the active session into the archive and clear it. Returns the path. */
export function archiveSession(session: Session, root: string = projectRoot()): string {
  const stamp = session.createdAt.replace(/[:.]/g, "-");
  const path = join(root, NBC_DIR, ARCHIVE_DIR, `${stamp}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(session, null, 2), "utf8");
  rmSync(sessionPath(root), { force: true });
  return path;
}
