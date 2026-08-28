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
export const projectRoot = (): string => {
  const fromEnv = process.env.NBC_PROJECT_ROOT;
  return fromEnv ? resolve(fromEnv) : process.cwd();
};

export const sessionPath = (root: string = projectRoot()): string =>
  join(root, NBC_DIR, SESSION_FILE);

/** Resolve a developer-supplied path against the project root. */
export const resolveInRoot = (path: string, root: string = projectRoot()): string =>
  isAbsolute(path) ? path : resolve(root, path);

export const loadSession = (root: string = projectRoot()): Session | null => {
  const path = sessionPath(root);
  if (!existsSync(path)) return null;
  const session = JSON.parse(readFileSync(path, "utf8")) as Session;
  session.learningRecords ??= [];
  return session;
};

/** Write atomically via a temp file + rename so a crash can't corrupt state. */
export const saveSession = (session: Session, root: string = projectRoot()): void => {
  const path = sessionPath(root);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(session, null, 2), "utf8");
  renameSync(tmp, path);
};

/** Move the active session into the archive and clear it. Returns the path. */
export const archiveSession = (session: Session, root: string = projectRoot()): string => {
  const stamp = session.createdAt.replace(/[:.]/g, "-");
  const path = join(root, NBC_DIR, ARCHIVE_DIR, `${stamp}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(session, null, 2), "utf8");
  rmSync(sessionPath(root), { force: true });
  return path;
};
