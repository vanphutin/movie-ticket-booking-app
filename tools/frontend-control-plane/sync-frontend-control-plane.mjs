import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const changed = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r?\n/g, "\n");
}

function scalar(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, "m"));
  if (!match) throw new Error(`Missing scalar ${key}`);
  return match[1].replace(/^["']|["']$/g, "");
}

function nestedScalar(text, parent, key) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line === `${parent}:`);
  if (start < 0) throw new Error(`Missing block ${parent}`);
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index] && !lines[index].startsWith("  ")) break;
    const match = lines[index].match(new RegExp(`^  ${key}:\\s*(.*?)\\s*$`));
    if (match) return match[1].replace(/^["']|["']$/g, "");
  }
  throw new Error(`Missing ${parent}.${key}`);
}

function writeIfChanged(relativePath, content) {
  const absolute = path.join(root, relativePath);
  const normalized = content.replace(/\r?\n/g, "\n");
  const existing = fs.existsSync(absolute) ? read(relativePath) : "";
  if (existing === normalized) return;
  changed.push(relativePath);
  if (!checkOnly) {
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, normalized, "utf8");
  }
}

function replaceRegion(content, region, body) {
  const start = `<!-- GENERATED:${region}:START -->`;
  const end = `<!-- GENERATED:${region}:END -->`;
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
  if (!pattern.test(content)) throw new Error(`Missing generated region ${region}`);
  return content.replace(pattern, `${start}\n${body.trimEnd()}\n${end}`);
}

const statePath = "clients/contracts/state/current-work.yml";
const routerPath = "project-control/active-workstream.yml";
const state = read(statePath);
const router = read(routerPath);
const backend = read("AI-contracts/state/current-work.yml");

const ticket = scalar(state, "ticket_id");
const candidate = scalar(state, "candidate_ticket_id");
const stage = scalar(state, "current_stage");
const artifact = scalar(state, "active_artifact");
const baseline = scalar(state, "effective_baseline");
const action = nestedScalar(state, "next_action", "type");
const target = nestedScalar(state, "next_action", "target");
const reason = nestedScalar(state, "next_action", "reason");
const completion = nestedScalar(state, "next_action", "completion_condition");
const review = nestedScalar(state, "statuses", "review");
const learning = nestedScalar(state, "statuses", "learning");
const activeWorkstream = scalar(router, "active_workstream");
const backendTicket = scalar(backend, "ticket_id");
const backendStage = scalar(backend, "current_stage");
const backendReview = nestedScalar(backend, "statuses", "review");

writeIfChanged("clients/contracts/state/current-ticket.yml", `# GENERATED FILE — run: npm run sync:frontend-control
schema_version: 1
ticket_id: ${ticket}
candidate_ticket_id: ${candidate}
current_stage: ${stage}
learning_status: ${learning}
review_status: ${review}
active_artifact: ${artifact}
updated_at: ${JSON.stringify(scalar(state, "updated_at"))}
`);

writeIfChanged("clients/contracts/state/next-action.yml", `# GENERATED FILE — run: npm run sync:frontend-control
schema_version: 1
ticket_id: ${ticket}
candidate_ticket_id: ${candidate}
action: ${action}
target: ${target}
priority_reason: ${JSON.stringify(reason)}
completion_condition: ${JSON.stringify(completion)}
`);

const handoff = `\`\`\`yaml
schema_version: 1
canonical_state: ${statePath}
effective_baseline: ${baseline}
current_stage: ${stage}
ticket_id: ${ticket}
candidate_ticket_id: ${candidate}
active_artifact: ${artifact}
learning_status: ${learning}
review_status: ${review}
next_action: ${action}
completion_condition: ${completion}
\`\`\``;
writeIfChanged(
  "clients/CODEX-CONTEXT.md",
  replaceRegion(read("clients/CODEX-CONTEXT.md"), "FRONTEND-HANDOFF", handoff)
);

const frontendFullStackStatus = review === "VERIFIED" ? "VERIFIED" : "IN_PROGRESS";
writeIfChanged("project-control/full-stack-status.yml", `# GENERATED FILE — run: npm run sync:frontend-control
schema_version: 1
active_workstream: ${activeWorkstream}
backend:
  canonical_state: AI-contracts/state/current-work.yml
  ticket_id: ${backendTicket}
  stage: ${backendStage}
  review_status: ${backendReview}
frontend:
  canonical_state: ${statePath}
  ticket_id: ${ticket}
  stage: ${stage}
  review_status: ${review}
  next_action: ${action}
full_stack:
  bootstrap_status: ${frontendFullStackStatus}
  product_status: PARTIAL
  limitation: Application UI has not been scaffolded or verified.
`);

if (changed.length) {
  const label = checkOnly ? "Frontend generated projection drift" : "Synchronized frontend projections";
  console.error(`${label}:`);
  for (const file of changed) console.error(`- ${file}`);
  if (checkOnly) process.exit(1);
} else {
  console.log("Frontend generated projections: synchronized");
}
