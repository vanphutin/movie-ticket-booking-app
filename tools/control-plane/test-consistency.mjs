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
  "docs/plan/movie-ticket-booking-master-plan.md",
  "docs/plan/movie-ticket-booking-master-plan.html",
  "tools/control-plane/sync-control-plane.mjs",
  "tools/control-plane/build-master-dashboard.mjs",
  "project-control/active-workstream.yml",
  "AI-contracts/state/work-unit-checkpoint.yml",
  "AI-contracts/roadmap/weeks-4-10.md",
  "clients/contracts/state/current-work.yml",
  "clients/contracts/state/work-unit-checkpoint.yml",
  "clients/contracts/roadmap/ticket-catalog.yml",
  "clients/contracts/roadmap/capability-map.yml",
  "clients/contracts/roadmap/phases.yml",
  "clients/contracts/roadmap/milestones.yml",
  "clients/contracts/integration/backend-capability-map.yml",
  "clients/contracts/integration/coverage-matrix.yml"
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
  const baseline = fs
    .readFileSync(path.join(temporaryRoot, "AI-contracts/state/current-work.yml"), "utf8")
    .match(/^effective_baseline:\s*(\S+)/m)?.[1];
  if (!baseline) throw new Error("Fixture canonical baseline is missing");
  const drifted = fs.readFileSync(readmePath, "utf8").replace(baseline, "PC-STALE");
  fs.writeFileSync(readmePath, drifted, "utf8");
  const drift = runCheck();
  if (drift.status === 0 || !`${drift.stderr}${drift.stdout}`.includes("AI-contracts/README.md")) {
    throw new Error("README current-status drift was not rejected");
  }

  const contextPath = path.join(temporaryRoot, "CODEX-CONTEXT.md");
  const contextSource = fs.readFileSync(contextPath, "utf8");
  if (contextSource.includes("coding_checkpoint:")) {
    const staleCheckpoint = contextSource.replace(
      /step_id:\s*[^\r\n]+/,
      "step_id: STALE-SESSION-STEP"
    );
    fs.writeFileSync(contextPath, staleCheckpoint, "utf8");
    const checkpointDrift = runCheck();
    if (
      checkpointDrift.status === 0 ||
      !`${checkpointDrift.stderr}${checkpointDrift.stdout}`.includes("CODEX-CONTEXT.md")
    ) {
      throw new Error("Stale coding-checkpoint handoff projection was not rejected");
    }
    fs.writeFileSync(contextPath, contextSource, "utf8");
  }

  fs.copyFileSync(path.join(root, "AI-contracts/README.md"), readmePath);
  const planPath = path.join(temporaryRoot, "docs/plan/movie-ticket-booking-master-plan.md");
  const stalePlan = fs.readFileSync(planPath, "utf8").replace(
    /Hoàn thành có xác minh: \*\*\d+\/35\*\*/,
    "Hoàn thành có xác minh: **35/35**"
  );
  fs.writeFileSync(planPath, stalePlan, "utf8");
  const planDrift = runCheck();
  if (
    planDrift.status === 0 ||
    !`${planDrift.stderr}${planDrift.stdout}`.includes(
      "docs/plan/movie-ticket-booking-master-plan.md"
    )
  ) {
    throw new Error("Plan progress drift was not rejected");
  }

  console.log("Consistency negative fixtures: PASSED");
  console.log("- synchronized fixture accepted");
  console.log("- stale README generated region rejected");
  console.log("- stale plan progress generated region rejected");
  console.log("- stale coding-checkpoint handoff rejected when checkpoint is active");
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
