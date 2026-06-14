#!/usr/bin/env node
/**
 * CLI for writing the mentor-mode rules files into a project.
 *
 *   no-blind-coding-init [destDir] [--only a,b] [--list] [--dry-run]
 */

import { TARGETS, generate } from "./index.js";

interface Args {
  destRoot: string;
  only?: string[];
  list: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { destRoot: process.cwd(), list: false, dryRun: false };
  let destSet = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--list") {
      args.list = true;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--only") {
      const value = argv[++i];
      if (!value) throw new Error("--only needs a comma-separated list of target ids.");
      args.only = value.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (arg.startsWith("--only=")) {
      args.only = arg.slice("--only=".length).split(",").map((s) => s.trim()).filter(Boolean);
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown flag: ${arg}`);
    } else if (!destSet) {
      args.destRoot = arg;
      destSet = true;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }
  return args;
}

function printTargets(): void {
  console.log("Available targets:");
  for (const target of TARGETS) {
    console.log(`  ${target.id.padEnd(13)} ${target.label.padEnd(20)} → ${target.file}`);
  }
}

function main(): void {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
    return;
  }

  if (args.list) {
    printTargets();
    return;
  }

  try {
    const results = generate(args.destRoot, { only: args.only, dryRun: args.dryRun });
    const label = args.dryRun ? "Would write" : "Wrote";
    console.log(`${label} mentor rules into ${args.destRoot}:`);
    for (const result of results) {
      console.log(`  [${result.action.padEnd(9)}] ${result.file}  (${result.targets.join(", ")})`);
    }
    console.log(
      "\nClaude Desktop has no rules file — it relies on the MCP server's instructions.",
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
