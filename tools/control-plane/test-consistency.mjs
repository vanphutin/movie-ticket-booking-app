import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "movie-ticket-consistency-"));
const files = [
  "AI-contracts/state/current-work.yml",
  "AI-contracts/state/contract-status.yml",
  "AI-contracts/state/current-ticket.yml",
  "AI-contracts/state/next-action.yml",
  "AI-contracts/README.md",
  "CODEX-CONTEXT.md",
  "tools/control-plane/sync-control-plane.mjs"
];

for (const relativePath of files) {
  const source = path.join(root, relativePath);
  const target = path.join(temporaryRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function runCheck() {
  return spawnSync(process.execPath, ["tools/control-plane/sync-control-plane.mjs", "--check"], {
    cwd: temporaryRoot,
    encoding: "utf8"
  });
}

try {
  const clean = runCheck();
  if (clean.status !== 0) {
    throw new Error(`Synchronized fixture was rejected: ${clean.stderr || clean.stdout}`);
  }

  const readmePath = path.join(temporaryRoot, "AI-contracts/README.md");
  const drifted = fs.readFileSync(readmePath, "utf8").replace("PC-2026.6", "PC-STALE");
  fs.writeFileSync(readmePath, drifted, "utf8");
  const drift = runCheck();
  if (drift.status === 0 || !`${drift.stderr}${drift.stdout}`.includes("AI-contracts/README.md")) {
    throw new Error("README current-status drift was not rejected");
  }

  console.log("Consistency negative fixtures: PASSED");
  console.log("- synchronized fixture accepted");
  console.log("- stale README generated region rejected");
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
