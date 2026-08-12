import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const changed = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function writeIfChanged(relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  const normalized = content.replace(/\r?\n/g, "\n");
  const existing = fs.existsSync(absolutePath)
    ? fs.readFileSync(absolutePath, "utf8").replace(/\r?\n/g, "\n")
    : "";
  if (existing === normalized) return;
  changed.push(relativePath);
  if (!checkOnly) fs.writeFileSync(absolutePath, normalized, "utf8");
}

function lines(text) {
  return text.replace(/\r?\n/g, "\n").split("\n");
}

function topScalar(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, "m"));
  if (!match) throw new Error(`Missing canonical scalar: ${key}`);
  const value = match[1].replace(/^["']|["']$/g, "");
  return value === "null" ? null : value;
}

function block(text, key, indent = 0) {
  const all = lines(text);
  const prefix = " ".repeat(indent);
  const start = all.findIndex((line) => line === `${prefix}${key}:`);
  if (start < 0) throw new Error(`Missing canonical block: ${key}`);
  const output = [];
  for (let index = start + 1; index < all.length; index += 1) {
    const line = all[index];
    if (line && !line.startsWith(`${prefix} `)) break;
    output.push(line);
  }
  return output.join("\n");
}

function blockScalar(text, parent, key) {
  const parentBlock = block(text, parent).replace(/^ {2}/gm, "");
  return topScalar(parentBlock, key);
}

function nestedBlock(text, parent, key) {
  const parentBlock = block(text, parent).replace(/^ {2}/gm, "");
  return block(parentBlock, key);
}

function listFromBlock(text, parent, key) {
  const parentText = block(text, parent).replace(/^ {2}/gm, "");
  const inline = parentText.match(new RegExp(`^${key}:\\s*\\[(.*?)\\]\\s*$`, "m"));
  if (inline) {
    return inline[1].trim()
      ? inline[1].split(",").map((value) => value.trim()).filter(Boolean)
      : [];
  }
  return block(parentText, key)
    .split("\n")
    .map((line) => line.match(/^\s*-\s+(.*)$/)?.[1])
    .filter(Boolean);
}

function boolOrScalar(text, parent, key) {
  return blockScalar(block(text, parent).replace(/^ {2}/gm, ""), "learning", key);
}

function quote(value) {
  return JSON.stringify(value ?? "");
}

function yamlList(values, indent = 2) {
  if (values.length === 0) return `${" ".repeat(indent)}[]`;
  return values.map((value) => `${" ".repeat(indent)}- ${value}`).join("\n");
}

function replaceRegion(content, region, generatedBody) {
  const start = `<!-- GENERATED:${region}:START -->`;
  const end = `<!-- GENERATED:${region}:END -->`;
  const pattern = new RegExp(
    `${start.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}`
  );
  if (!pattern.test(content)) throw new Error(`Missing generated region ${region}`);
  return content.replace(pattern, `${start}\n${generatedBody.trimEnd()}\n${end}`);
}

const currentWorkPath = "AI-contracts/state/current-work.yml";
const contractStatusPath = "AI-contracts/state/contract-status.yml";
const currentWork = read(currentWorkPath);
const contractStatus = read(contractStatusPath);

const ticket = topScalar(currentWork, "ticket_id");
const candidate = topScalar(currentWork, "candidate_ticket_id");
const completedTickets = block(currentWork, "completed_ticket_ids")
  .split("\n")
  .map((line) => line.match(/^\s*-\s+(TKT-W\d{2}-D\d{2})\s*$/)?.[1])
  .filter(Boolean);
const stage = topScalar(currentWork, "current_stage");
const baseline = topScalar(currentWork, "effective_baseline");
const activeArtifact = topScalar(currentWork, "active_artifact");
const updatedAt = topScalar(currentWork, "updated_at");
const updatedBy = topScalar(currentWork, "updated_by");
const phaseId = blockScalar(currentWork, "ticket_projection", "phase_id");
const milestoneId = blockScalar(currentWork, "ticket_projection", "milestone_id");
const capabilities = listFromBlock(currentWork, "ticket_projection", "capability_ids");
const contracts = listFromBlock(currentWork, "ticket_projection", "contract_ids");
const readiness = blockScalar(currentWork, "statuses", "readiness");
const execution = blockScalar(currentWork, "ticket_projection", "execution_status");
const review = blockScalar(currentWork, "statuses", "review");
const evidence = blockScalar(currentWork, "statuses", "evidence");
const confidence = blockScalar(currentWork, "ticket_projection", "evidence_confidence");
const learningStatus = blockScalar(currentWork, "statuses", "learning");
const gateId = boolOrScalar(currentWork, "ticket_projection", "gate_id");
const learningMode = boolOrScalar(currentWork, "ticket_projection", "mode");
const topics = listFromBlock(
  block(currentWork, "ticket_projection").replace(/^ {2}/gm, ""),
  "learning",
  "topics_presented"
);
const observedGaps = listFromBlock(
  block(currentWork, "ticket_projection").replace(/^ {2}/gm, ""),
  "learning",
  "observed_gaps"
);
const remediationFocus = listFromBlock(
  block(currentWork, "ticket_projection").replace(/^ {2}/gm, ""),
  "learning",
  "remediation_focus"
);
const designUnlocked = boolOrScalar(currentWork, "ticket_projection", "design_unlocked");
const skeletonUnlocked = boolOrScalar(currentWork, "ticket_projection", "skeleton_unlocked");
const lastObservation = boolOrScalar(currentWork, "ticket_projection", "last_observation");
const hasCodingCheckpoint = /^coding_checkpoint:\s*$/m.test(currentWork);
const codingCheckpoint = hasCodingCheckpoint ? block(currentWork, "coding_checkpoint").replace(/^ {2}/gm, "") : "";
const codingStepId = hasCodingCheckpoint ? topScalar(codingCheckpoint, "step_id") : null;
const codingPhase = hasCodingCheckpoint ? topScalar(codingCheckpoint, "phase") : null;
const codingStatus = hasCodingCheckpoint ? topScalar(codingCheckpoint, "status") : null;
const codingCompletion = hasCodingCheckpoint
  ? topScalar(codingCheckpoint, "completion_condition")
  : null;

const currentTicket = `# GENERATED FILE — run: node tools/control-plane/sync-control-plane.mjs
schema_version: 1
ticket_id: ${ticket ?? "null"}
candidate_ticket_id: ${candidate ?? "null"}
phase_id: ${phaseId}
milestone_id: ${milestoneId}
capability_ids:
${yamlList(capabilities)}
contract_ids:
${yamlList(contracts)}
definition_of_ready_status: ${readiness}
execution_status: ${execution}
review_status: ${review}
evidence_status: ${evidence}
evidence_confidence: ${confidence}
learning:
  gate_id: ${gateId}
  status: ${learningStatus}
  mode: ${learningMode}
  topics_presented:
${yamlList(topics, 4)}
  observed_gaps:${observedGaps.length ? `\n${yamlList(observedGaps, 4)}` : " []"}
  remediation_focus:${remediationFocus.length ? `\n${yamlList(remediationFocus, 4)}` : " []"}
  design_unlocked: ${designUnlocked}
  skeleton_unlocked: ${skeletonUnlocked}
  last_observation: ${quote(lastObservation)}
blockers: []
remediation_action: null
updated_at: ${quote(updatedAt)}
updated_by: ${updatedBy}
`;
writeIfChanged("AI-contracts/state/current-ticket.yml", currentTicket);

const action = blockScalar(currentWork, "next_action", "type");
const actionTarget = blockScalar(currentWork, "next_action", "target");
const reason = blockScalar(currentWork, "next_action", "reason");
const completion = blockScalar(currentWork, "next_action", "completion_condition");
const onSuccess = blockScalar(currentWork, "next_action", "on_success");
const onFailure = blockScalar(currentWork, "next_action", "on_failure");
const requiredEvidence = listFromBlock(currentWork, "next_action_projection", "required_evidence");
const sourceEvidence = listFromBlock(currentWork, "next_action_projection", "source_evidence");
const decidedAt = blockScalar(currentWork, "next_action_projection", "decided_at");
const decidedBy = blockScalar(currentWork, "next_action_projection", "decided_by");
const decisionStatus = blockScalar(currentWork, "next_action_projection", "decision_status");
const blockingIds = listFromBlock(currentWork, "next_action_projection", "blocking_ids");

const nextAction = `# GENERATED FILE — run: node tools/control-plane/sync-control-plane.mjs
schema_version: 1
decision_status: ${decisionStatus}
next_ticket_id: ${ticket ?? "null"}
candidate_ticket_id: ${candidate ?? "null"}
action: ${action}
target: ${actionTarget}
priority_reason: ${quote(reason)}
completion_condition: ${quote(completion)}
on_success: ${onSuccess}
on_failure: ${onFailure}
blocking_ids:${blockingIds.length ? `\n${yamlList(blockingIds)}` : " []"}
required_evidence:
${yamlList(requiredEvidence)}
source_evidence:
${yamlList(sourceEvidence)}
decided_at: ${quote(decidedAt)}
decided_by: ${quote(decidedBy)}
`;
writeIfChanged("AI-contracts/state/next-action.yml", nextAction);

const handoff = `schema_version: 1
canonical_state: ${currentWorkPath}
effective_baseline: ${baseline}
current_stage: ${stage}
ticket_id: ${ticket ?? "null"}
candidate_ticket_id: ${candidate ?? "null"}
active_artifact: ${activeArtifact ?? "null"}
primary_blocker: NONE
required_output: ${blockScalar(currentWork, "required_output", "type")}
evidence_status: ${evidence}
review_status: ${review}
next_action: ${action}
completion_condition: ${completion}${hasCodingCheckpoint ? `
coding_checkpoint:
  step_id: ${codingStepId}
  phase: ${codingPhase}
  status: ${codingStatus}
  completion_condition: ${codingCompletion}` : ""}`;

let context = read("CODEX-CONTEXT.md");
if (!context.includes("<!-- GENERATED:CURRENT-HANDOFF:START -->")) {
  context = context.replace(
    /```yaml\n(schema_version: 1[\s\S]*?)\n```/,
    "<!-- GENERATED:CURRENT-HANDOFF:START -->\n```yaml\n$1\n```\n<!-- GENERATED:CURRENT-HANDOFF:END -->"
  );
}
context = replaceRegion(
  context,
  "CURRENT-HANDOFF",
  `\`\`\`yaml\n${handoff}\n\`\`\``
);
writeIfChanged("CODEX-CONTEXT.md", context);

const approvedIds = [
  ...block(contractStatus, "approved_change_requests").matchAll(
    /^\s+- id: (CCR-\d+)$/gm
  )
].map((match) => match[1]);
const openInline = contractStatus.match(/^open_change_requests:\s*\[(.*?)\]\s*$/m);
const openCount = openInline
  ? openInline[1].trim()
    ? openInline[1].split(",").filter((value) => value.trim()).length
    : 0
  : (block(contractStatus, "open_change_requests").match(/^\s+-\s+/gm) ?? []).length;
const readmeStatus = `- Baseline đang có hiệu lực: \`${baseline}\` — \`${topScalar(contractStatus, "effective_status")}\`.
- Ticket hiện tại: \`${ticket ?? "NONE"}\`; candidate: \`${candidate ?? "NONE"}\`.
- Stage hiện tại: \`${stage}\`; next action: \`${action}\`.
- Open change requests: ${openCount === 0 ? "không có" : openCount}.
- Approved change requests: \`${approvedIds[0]}\` đến \`${approvedIds.at(-1)}\`.`;
const readme = replaceRegion(read("AI-contracts/README.md"), "CURRENT-STATUS", readmeStatus);
writeIfChanged("AI-contracts/README.md", readme);

const planTicketIds = [];
for (let week = 4; week <= 10; week += 1) {
  for (let day = 1; day <= 5; day += 1) {
    planTicketIds.push(`TKT-W${String(week).padStart(2, "0")}-D${String(day).padStart(2, "0")}`);
  }
}
const completedSet = new Set(completedTickets);
const planRows = planTicketIds.map((id) => {
  if (completedSet.has(id)) return `| ☑ | \`${id}\` | \`VERIFIED\` | Canonical completed ticket |`;
  if (id === ticket) return `| ◉ | \`${id}\` | \`${stage}\` | Current authorized ticket |`;
  if (id === candidate) return `| ☐ | \`${id}\` | \`CANDIDATE\` | Not authorized |`;
  return `| ☐ | \`${id}\` | \`PLANNED\` | Not started |`;
});
const planProgress = `## Tiến độ canonical tự động

> Vùng này được sinh từ \`${currentWorkPath}\`. Dấu ☑ chỉ dành cho ticket có review
> \`VERIFIED\` và handoff; ◉ là ticket đang được authorize. Không sửa checkbox bằng tay.

- Baseline: \`${baseline}\`
- Ticket hiện tại: \`${ticket ?? "NONE"}\` — stage \`${stage}\`
- Hoàn thành có xác minh: **${completedTickets.length}/${planTicketIds.length}**
- Next action: \`${action}\`

| | Ticket | Trạng thái | Ý nghĩa |
|---|---|---|---|
${planRows.join("\n")}`;
const planMarkdown = replaceRegion(
  read("docs/plan/movie-ticket-booking-master-plan.md"),
  "PLAN-PROGRESS",
  planProgress
);
writeIfChanged("docs/plan/movie-ticket-booking-master-plan.md", planMarkdown);

const dashboardArgs = ["tools/control-plane/build-master-dashboard.mjs", ...(checkOnly ? ["--check"] : [])];
const dashboard = spawnSync(process.execPath, dashboardArgs, { cwd: root, encoding: "utf8" });
if (dashboard.status !== 0) {
  console.error((dashboard.stderr || dashboard.stdout).trim());
  process.exit(dashboard.status ?? 1);
}

const docsViewerBuilder = path.join(root, "docs-viewer/build-data.js");
if (fs.existsSync(docsViewerBuilder)) {
  const { buildDocsDataPayload } = require(docsViewerBuilder);
  const docsDataContent = buildDocsDataPayload(root);
  writeIfChanged("docs-viewer/docs-data.js", docsDataContent);
}

if (changed.length > 0) {
  const prefix = checkOnly ? "Generated projection drift" : "Synchronized generated projections";
  console.error(`${prefix}:`);
  for (const target of changed) console.error(`- ${target}`);
  if (checkOnly) process.exit(1);
} else {
  console.log("Generated projections: synchronized");
}
