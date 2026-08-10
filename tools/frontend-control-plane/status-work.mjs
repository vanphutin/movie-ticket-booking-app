import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const router = fs.readFileSync(path.join(root, "project-control/active-workstream.yml"), "utf8");
const scalar = (text, key) => text.match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, "m"))?.[1]?.replace(/^["']|["']$/g, "");
const nested = (text, parent, key) => {
  const block = text.split(new RegExp(`^${parent}:\\s*$`, "m"))[1]?.split(/^\\S/m)[0] ?? "";
  return block.match(new RegExp(`^  ${key}:\\s*(.*?)\\s*$`, "m"))?.[1]?.replace(/^["']|["']$/g, "");
};

const active = scalar(router, "active_workstream");
const statePath = active === "frontend" ? "clients/contracts/state/current-work.yml" : "AI-contracts/state/current-work.yml";
const state = fs.readFileSync(path.join(root, statePath), "utf8");

console.log(`ACTIVE WORKSTREAM: ${active.toUpperCase()}`);
console.log(`CANONICAL STATE: ${statePath}`);
console.log(`CURRENT TICKET: ${scalar(state, "ticket_id")}`);
console.log(`STAGE: ${scalar(state, "current_stage")}`);
console.log(`NEXT ACTION: ${nested(state, "next_action", "type")}`);
console.log(`TARGET: ${nested(state, "next_action", "target")}`);
console.log(`COMPLETION: ${nested(state, "next_action", "completion_condition")}`);
