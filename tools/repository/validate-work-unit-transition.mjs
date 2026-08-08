import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const statePath = path.join(root, "AI-contracts/state/current-work.yml");
const checkpointPath = path.join(root, "AI-contracts/state/work-unit-checkpoint.yml");
const errors = [];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function scalar(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, "m"));
  if (!match) return undefined;
  return match[1].replace(/^["']|["']$/g, "");
}

function git(args) {
  return spawnSync("git", args, { cwd: root, encoding: "utf8" });
}

const state = read(statePath);
const checkpoint = read(checkpointPath);
const currentTicket = scalar(state, "ticket_id");
const stage = scalar(state, "current_stage");
const incoming = scalar(checkpoint, "incoming_work_unit");
const outgoing = scalar(checkpoint, "outgoing_work_unit");
const branch = scalar(checkpoint, "outgoing_branch");
const commit = scalar(checkpoint, "published_checkpoint_commit");
const remoteRef = scalar(checkpoint, "remote_tracking_ref");
const draftPr = scalar(checkpoint, "draft_pr_url");
const status = scalar(checkpoint, "status");
const currentBranchResult = git(["branch", "--show-current"]);
const currentBranch = currentBranchResult.stdout.trim();
const normalizedTicket = currentTicket?.toLowerCase();

if (stage === "STARTUP" && currentTicket && !currentBranch.toLowerCase().includes(normalizedTicket)) {
  errors.push(`STARTUP ticket ${currentTicket} must use a matching branch; current=${currentBranch}`);
}

if (stage === "STARTUP" && currentTicket && checkpoint) {
  if (incoming !== currentTicket) {
    errors.push(`Checkpoint incoming_work_unit=${incoming} does not match current ticket ${currentTicket}`);
  }
  if (!outgoing || !branch || !commit || !remoteRef || !draftPr) {
    errors.push("Publication checkpoint is missing required evidence");
  }
  if (status !== "VERIFIED") {
    errors.push(`Publication checkpoint status must be VERIFIED; found ${status ?? "MISSING"}`);
  }
  if (["main", "master"].includes(branch)) {
    errors.push(`Publication checkpoint cannot use default branch '${branch}'`);
  }
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/.test(draftPr ?? "")) {
    errors.push("Publication checkpoint Draft PR URL is missing or invalid");
  }
  if (/^(pending|todo|unknown|none)$/i.test(commit ?? "")) {
    errors.push("Publication checkpoint commit contains a placeholder");
  } else if (commit) {
    const commitExists = git(["cat-file", "-e", `${commit}^{commit}`]);
    if (commitExists.status !== 0) {
      errors.push(`Published checkpoint commit does not exist locally: ${commit}`);
    }
    if (remoteRef) {
      const remoteExists = git(["show-ref", "--verify", "--quiet", `refs/remotes/${remoteRef}`]);
      if (remoteExists.status !== 0) {
        errors.push(`Remote-tracking ref is unavailable: ${remoteRef}`);
      } else {
        const reachable = git(["merge-base", "--is-ancestor", commit, remoteRef]);
        if (reachable.status !== 0) {
          errors.push(`${commit} is not reachable from ${remoteRef}`);
        }
      }
    }
  }
}

if (errors.length) {
  console.error("Work-unit transition validation: FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Work-unit transition validation: PASSED");
console.log(`- current ticket: ${currentTicket ?? "none"}`);
console.log(`- current branch: ${currentBranch || "detached"}`);
console.log(`- recorded transition: ${outgoing ?? "none"} -> ${incoming ?? "none"}`);
