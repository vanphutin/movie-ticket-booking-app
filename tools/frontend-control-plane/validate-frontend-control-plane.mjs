import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const errors = [];

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) {
    errors.push(`Missing required path: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolute, "utf8");
}

function scalar(text, key) {
  return text.match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, "m"))?.[1]?.replace(/^["']|["']$/g, "");
}

const router = read("project-control/active-workstream.yml");
const state = read("clients/contracts/state/current-work.yml");
read("clients/contracts/schemas/current-work.schema.json");
read("clients/contracts/tickets/FE-TKT-W00-D01.yml");
read("clients/contracts/tickets/FE-TKT-W01-D01.yml");
read("clients/AGENTS.md");

const active = scalar(router, "active_workstream");
if (!new Set(["backend", "frontend"]).has(active)) errors.push(`Invalid active_workstream: ${active}`);
const activeCount = (router.match(/^    status: ACTIVE$/gm) ?? []).length;
if (activeCount !== 1) errors.push(`Router must contain exactly one ACTIVE workstream; found ${activeCount}`);
if (scalar(state, "workstream") !== "frontend") errors.push("Frontend canonical state has wrong workstream");
if (!scalar(state, "ticket_id") || !scalar(state, "candidate_ticket_id")) {
  errors.push("Frontend state must declare current and candidate tickets");
}
if ((state.match(/^next_action:$/gm) ?? []).length !== 1) errors.push("Frontend state must own one next_action block");
if (fs.existsSync(path.join(root, "clients/package.json")) || fs.existsSync(path.join(root, "clients/src"))) {
  errors.push("CCR-014 forbids frontend application scaffolding");
}

const sync = spawnSync(process.execPath, ["tools/frontend-control-plane/sync-frontend-control-plane.mjs", "--check"], {
  cwd: root,
  encoding: "utf8"
});
if (sync.status !== 0) errors.push((sync.stderr || sync.stdout).trim());

if (errors.length) {
  console.error("Frontend control plane: FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Frontend control plane: PASSED");
console.log(`- active workstream: ${active}`);
console.log(`- frontend ticket: ${scalar(state, "ticket_id")}`);
console.log(`- frontend candidate: ${scalar(state, "candidate_ticket_id")}`);
console.log("- application scaffold: absent by design");
