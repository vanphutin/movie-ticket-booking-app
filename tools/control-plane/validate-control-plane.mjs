import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const errors = [];
const warnings = [];

const syncCheck = spawnSync(process.execPath, ["tools/control-plane/sync-control-plane.mjs", "--check"], {
  cwd: root,
  encoding: "utf8"
});
if (syncCheck.status !== 0) {
  errors.push(`Generated projection drift: ${(syncCheck.stderr || syncCheck.stdout).trim()}`);
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function scalar(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, "m"));
  if (!match) return undefined;
  const value = match[1].replace(/^["']|["']$/g, "");
  return value === "null" ? null : value;
}

function section(text, key) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `${key}:`);
  if (start < 0) return "";
  const collected = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line && !line.startsWith(" ")) break;
    collected.push(line);
  }
  return collected.join("\n");
}

function nestedScalar(text, parent, key) {
  return scalar(section(text, parent).replace(/^ {2}/gm, ""), key);
}

function requireKeys(text, relativePath, keys) {
  for (const key of keys) {
    if (!new RegExp(`^${key}:`, "m").test(text)) {
      errors.push(`${relativePath}: missing top-level key '${key}'`);
    }
  }
}

const currentWorkPath = "AI-contracts/state/current-work.yml";
const currentTicketPath = "AI-contracts/state/current-ticket.yml";
const nextActionPath = "AI-contracts/state/next-action.yml";
const contractStatusPath = "AI-contracts/state/contract-status.yml";

const currentWork = read(currentWorkPath);
const currentTicket = read(currentTicketPath);
const nextAction = read(nextActionPath);
const contractStatus = read(contractStatusPath);
const context = read("CODEX-CONTEXT.md");
read("AGENTS.md");
read("AI-contracts/schemas/current-work.schema.json");
read("AI-contracts/schemas/ticket.schema.json");
read("AI-contracts/templates/analysis-note.md");
read("AI-contracts/templates/expected-files.yml");
read("AI-contracts/templates/readiness-verdict.yml");
read("AI-contracts/templates/acceptance-review.yml");
const learningStandard = read("AI-contracts/20-learning-gate-standard.md");
const decisionLearning = read("AI-contracts/learning/decision-learning-standard.md");
const capabilityMap = read("AI-contracts/learning/capability-learning-map.md");
const lessonSpecs = read("AI-contracts/learning/capability-lesson-specs.md");
const ticketLearningMap = read("AI-contracts/learning/ticket-learning-map-weeks-4-10.md");
const referenceProfiles = read("AI-contracts/learning/reference-profiles.yml");
const retentionMap = read("AI-contracts/learning/knowledge-retention.yml");
const endpointMapPath = "AI-contracts/traceability/backlog-contract-map.yml";
const endpointMap = read(endpointMapPath);
const endpointSchema = read("AI-contracts/schemas/backlog-contract-map.schema.json");
const apiContract = read("AI-contracts/contracts/api-contracts.md");
const qualityContract = read("AI-contracts/contracts/quality-contract.md");
const securityContract = read("AI-contracts/contracts/security-contract.md");
const apiBacklog = read("docs/product-backlog/06-api-backlog-summary.md");
const negativeCases = read("tools/control-plane/fixtures/backlog-contract-negative-cases.json");
const codingCheckpointCases = read("tools/control-plane/fixtures/coding-checkpoint-cases.json");
const currentWorkSchema = read("AI-contracts/schemas/current-work.schema.json");
const d05ExpectedFiles = read(
  "AI-contracts/expected-files/2026-07-30-tkt-w04-d05-expected-files.yml"
);

requireKeys(currentWork, currentWorkPath, [
  "schema_version",
  "effective_baseline",
  "current_stage",
  "ticket_id",
  "candidate_ticket_id",
  "statuses",
  "blockers",
  "required_output",
  "next_action"
]);

const allowedStages = new Set([
  "FOUNDATION_GATE",
  "STARTUP",
  "LEARNING",
  "ANALYSIS",
  "DESIGN",
  "READINESS",
  "IMPLEMENTATION",
  "VERIFICATION",
  "REVIEW",
  "HANDOFF",
  "BLOCKED"
]);
const stage = scalar(currentWork, "current_stage");
if (stage && !allowedStages.has(stage)) {
  errors.push(`${currentWorkPath}: invalid current_stage '${stage}'`);
}

const workTicket = scalar(currentWork, "ticket_id");
const projectedTicket = scalar(currentTicket, "ticket_id");
const workCandidate = scalar(currentWork, "candidate_ticket_id");
const projectedCandidate = scalar(currentTicket, "candidate_ticket_id");
const actionCandidate = scalar(nextAction, "candidate_ticket_id");
const workReview = nestedScalar(currentWork, "statuses", "review");
const projectedReview = scalar(currentTicket, "review_status");
const workAction = nestedScalar(currentWork, "next_action", "type");
const projectedAction = scalar(nextAction, "action");
const baseline = scalar(currentWork, "effective_baseline");
const effectiveBaseline = scalar(contractStatus, "effective_baseline");

function checkpointModelFindings(model, expectedTicket, expectedStage, approvedPaths) {
  const findings = [];
  const requiredFields = [
    "step_id", "ticket_id", "scope", "feature", "layer", "phase", "status", "problem",
    "reason", "previous_observed_step", "allowed_paths", "required_behaviors", "exclusions",
    "verification", "completion_condition", "evidence", "updated_at", "updated_by"
  ];
  for (const field of requiredFields) {
    if (!(field in model)) findings.push(`checkpoint missing ${field}`);
  }
  if (expectedStage !== "IMPLEMENTATION") findings.push("checkpoint requires IMPLEMENTATION stage");
  if (!expectedTicket || model.ticket_id !== expectedTicket) findings.push("checkpoint ticket mismatch");
  if (!Array.isArray(model.allowed_paths) || model.allowed_paths.length === 0) {
    findings.push("checkpoint requires allowed_paths");
  } else {
    for (const allowedPath of model.allowed_paths) {
      if (!approvedPaths.has(allowedPath)) findings.push(`unauthorized checkpoint path ${allowedPath}`);
    }
  }
  const forbiddenKeys = new Set(["password", "secret", "credential", "raw_token", "raw_refresh_token"]);
  for (const key of Object.keys(model)) {
    if (forbiddenKeys.has(key)) findings.push(`forbidden sensitive checkpoint field ${key}`);
  }
  return findings;
}

const approvedD05Paths = new Set(
  [...d05ExpectedFiles.matchAll(/^  - path:\s+(.+)$/gm)].map((match) => match[1].trim())
);
const checkpointText = section(currentWork, "coding_checkpoint");
if (checkpointText) {
  const normalized = checkpointText.replace(/^ {2}/gm, "");
  const requiredCheckpointScalars = [
    "step_id", "ticket_id", "scope", "feature", "layer", "phase", "status", "problem",
    "reason", "previous_observed_step", "completion_condition", "evidence", "updated_at", "updated_by"
  ];
  for (const key of requiredCheckpointScalars) {
    if (scalar(normalized, key) === undefined) errors.push(`${currentWorkPath}: coding_checkpoint missing '${key}'`);
  }
  for (const key of ["allowed_paths", "required_behaviors", "exclusions", "verification"]) {
    if (!new RegExp(`^${key}:`, "m").test(normalized)) {
      errors.push(`${currentWorkPath}: coding_checkpoint missing '${key}'`);
    }
  }
  const allowedPaths = section(normalized, "allowed_paths")
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-\s+(.+)$/)?.[1])
    .filter(Boolean);
  const model = {
    step_id: scalar(normalized, "step_id"),
    ticket_id: scalar(normalized, "ticket_id"),
    scope: scalar(normalized, "scope"),
    feature: scalar(normalized, "feature"),
    layer: scalar(normalized, "layer"),
    phase: scalar(normalized, "phase"),
    status: scalar(normalized, "status"),
    problem: scalar(normalized, "problem"),
    reason: scalar(normalized, "reason"),
    previous_observed_step: scalar(normalized, "previous_observed_step"),
    allowed_paths: allowedPaths,
    required_behaviors: section(normalized, "required_behaviors"),
    exclusions: section(normalized, "exclusions"),
    verification: section(normalized, "verification"),
    completion_condition: scalar(normalized, "completion_condition"),
    evidence: scalar(normalized, "evidence"),
    updated_at: scalar(normalized, "updated_at"),
    updated_by: scalar(normalized, "updated_by")
  };
  for (const finding of checkpointModelFindings(model, workTicket, stage, approvedD05Paths)) {
    errors.push(`${currentWorkPath}: ${finding}`);
  }
  if (/^\s+(?:password|secret|credential|raw_token|raw_refresh_token):/m.test(checkpointText)) {
    errors.push(`${currentWorkPath}: forbidden sensitive checkpoint field`);
  }
}

for (const marker of ["coding_checkpoint", "allowed_paths", "completion_condition", "verification"]) {
  if (!currentWorkSchema.includes(`\"${marker}\"`)) {
    errors.push(`Current-work schema missing checkpoint marker '${marker}'`);
  }
}

try {
  const fixtures = JSON.parse(codingCheckpointCases);
  for (const fixture of fixtures.cases ?? []) {
    const checkpoint = {
      ...fixtures.base_checkpoint,
      ...(fixture.overrides ?? {})
    };
    for (const key of fixture.delete ?? []) delete checkpoint[key];
    const findings = checkpointModelFindings(
      checkpoint,
      fixture.ticket_id,
      fixture.stage,
      approvedD05Paths
    );
    const accepted = findings.length === 0;
    if (accepted !== fixture.expected_valid) {
      errors.push(`Coding-checkpoint fixture '${fixture.id}' produced unexpected result`);
    }
  }
} catch (error) {
  errors.push(`Invalid coding-checkpoint fixture JSON: ${error.message}`);
}

if (workTicket !== projectedTicket) {
  errors.push(`Ticket projection drift: current-work=${workTicket}, current-ticket=${projectedTicket}`);
}
if (workCandidate !== projectedCandidate || workCandidate !== actionCandidate) {
  errors.push("Candidate ticket projection drift across canonical and compatibility state");
}
if (workReview !== projectedReview) {
  errors.push(`Review projection drift: current-work=${workReview}, current-ticket=${projectedReview}`);
}
if (workAction !== projectedAction) {
  errors.push(`Next-action projection drift: current-work=${workAction}, next-action=${projectedAction}`);
}
if (baseline !== effectiveBaseline) {
  errors.push(`Baseline drift: current-work=${baseline}, contract-status=${effectiveBaseline}`);
}

const actionBlock = section(currentWork, "next_action");
const actionIds = [...actionBlock.matchAll(/^ {2}id:\s*(.+)$/gm)];
if (actionIds.length !== 1) {
  errors.push(`${currentWorkPath}: expected exactly one next_action.id, found ${actionIds.length}`);
}
for (const key of ["type", "target", "reason", "completion_condition", "on_success", "on_failure"]) {
  if (nestedScalar(currentWork, "next_action", key) === undefined) {
    errors.push(`${currentWorkPath}: next_action missing '${key}'`);
  }
}

const readiness = nestedScalar(currentWork, "statuses", "readiness");
const implementation = nestedScalar(currentWork, "statuses", "implementation");
if (implementation !== "NOT_STARTED" && readiness !== "READY") {
  errors.push("Implementation cannot advance while readiness is not READY");
}

const blockerIds = [...currentWork.matchAll(/^  - id:\s*(.+)$/gm)].map((match) => match[1]);
if (blockerIds.includes("FG-001") && workTicket !== null) {
  errors.push("FG-001 blocks authorization: ticket_id must remain null");
}

const contextCanonical = scalar(context, "canonical_state");
const contextTicket = scalar(context, "ticket_id");
const contextCandidate = scalar(context, "candidate_ticket_id");
const contextStage = scalar(context, "current_stage");
if (contextCanonical !== currentWorkPath) {
  errors.push("CODEX-CONTEXT.md must point to the canonical current-work state");
}
if (contextTicket !== workTicket || contextCandidate !== workCandidate || contextStage !== stage) {
  errors.push("CODEX-CONTEXT.md handoff projection drifts from current-work.yml");
}

if (!fs.existsSync(path.join(root, "package.json"))) {
  warnings.push("No root package.json: use the direct Node validator command; no npm script is claimed.");
}

const capabilityIds = new Set(
  [...capabilityMap.matchAll(/^\| (CAP-[A-Z]+-\d+) \|/gm)].map((match) => match[1])
);
const lessonCapabilityIds = new Set(
  [...lessonSpecs.matchAll(/^## (CAP-[A-Z]+-\d+) —/gm)].map((match) => match[1])
);
if (capabilityIds.size !== 13) {
  errors.push(`Expected 13 capability-map entries, found ${capabilityIds.size}`);
}
for (const capabilityId of capabilityIds) {
  if (!lessonCapabilityIds.has(capabilityId)) {
    errors.push(`Missing lesson specification for ${capabilityId}`);
  }
}
for (const requiredPhrase of [
  "available options",
  "rejected alternatives",
  "change conditions",
  "counterexample",
  "C4_DEFEND",
  "1–3 external documentation links"
]) {
  if (!decisionLearning.toLowerCase().includes(requiredPhrase.toLowerCase())) {
    errors.push(`Decision-learning standard missing required concept: ${requiredPhrase}`);
  }
}
for (const requiredField of [
  "decision_points",
  "counterexamples",
  "target_level",
  "reference_profile"
]) {
  if (!learningStandard.includes(`${requiredField}:`)) {
    errors.push(`Learning-gate schema missing '${requiredField}'`);
  }
}

const profileMatches = [...referenceProfiles.matchAll(/^  (REF-[A-Z-]+):\s*$/gm)];
const profileLinks = new Map();
for (let index = 0; index < profileMatches.length; index += 1) {
  const profile = profileMatches[index][1];
  const start = profileMatches[index].index + profileMatches[index][0].length;
  const end =
    index + 1 < profileMatches.length ? profileMatches[index + 1].index : referenceProfiles.length;
  const body = referenceProfiles.slice(start, end);
  const urls = [...body.matchAll(/^\s+url:\s+(https:\/\/\S+)\s*$/gm)].map((match) => match[1]);
  profileLinks.set(profile, urls);
  if (urls.length < 1 || urls.length > 3) {
    errors.push(`Reference profile ${profile} must contain 1–3 links; found ${urls.length}`);
  }
}

const gateMatrix = ticketLearningMap.split("## Gate depth and reference matrix")[1] ?? "";
const gateRows = [
  ...gateMatrix.matchAll(
    /^\| (LG-TKT-W\d{2}-D\d{2}) \| (C[1-4]_[A-Z]+) \| (REF-[A-Z-]+) \|/gm
  )
];
const gateIds = new Set(gateRows.map((match) => match[1]));
if (gateRows.length !== 35 || gateIds.size !== 35) {
  errors.push(`Expected 35 unique gate depth/reference rows, found ${gateRows.length}/${gateIds.size}`);
}
for (const [, gateId, targetLevel, profile] of gateRows) {
  if (!profileLinks.has(profile)) {
    errors.push(`${gateId}: unknown reference profile '${profile}'`);
  }
  if (!new Set(["C1_EXPLAIN", "C2_APPLY", "C3_INTEGRATE", "C4_DEFEND"]).has(targetLevel)) {
    errors.push(`${gateId}: invalid target level '${targetLevel}'`);
  }
}

const definedGateIds = new Set(
  [...ticketLearningMap.matchAll(/^\| (LG-TKT-W\d{2}-D\d{2}) \| TKT-/gm)].map(
    (match) => match[1]
  )
);
for (const gateId of definedGateIds) {
  if (!gateIds.has(gateId)) errors.push(`${gateId}: missing depth/reference assignment`);
}
for (const gateId of [
  ...retentionMap.matchAll(/LG-TKT-W\d{2}-D\d{2}/g)
].map((match) => match[0])) {
  if (!gateIds.has(gateId)) errors.push(`Retention map references unknown gate '${gateId}'`);
}
if (workTicket === null && workCandidate === null) {
  warnings.push("No authorized or candidate ticket is selected.");
}

function validateEndpointRegistry(text) {
  const findings = [];
  const rows = [...text.matchAll(
    /^  - \{ endpoint_id: ([^,]+), backlog_ids: \[([^\]]*)\], method: ([A-Z]+), path: "([^"]+)", owner: ([^,]+), priority: (MUST|SHOULD|COULD), disposition: ([A-Z_]+), auth: ([^,]+), idempotency: ([^,]+), capability_ids: \[([^\]]*)\], ticket_ids: \[([^\]]*)\] \}$/gm
  )].map((match) => ({
    id: match[1],
    method: match[3],
    path: match[4],
    disposition: match[7],
    capabilities: match[10].trim(),
    tickets: match[11].trim()
  }));
  if (scalar(text, "endpoint_count") !== "55" || rows.length !== 55) {
    findings.push(`expected exactly 55 endpoint rows, found ${rows.length}`);
  }
  const ids = new Set();
  const routes = new Set();
  const allowed = new Set(["CORE_REQUIRED", "CORE_OPTIONAL", "STRETCH", "POST_MVP"]);
  for (const row of rows) {
    if (ids.has(row.id)) findings.push(`duplicate endpoint_id ${row.id}`);
    ids.add(row.id);
    const route = `${row.method} ${row.path}`;
    if (routes.has(route)) findings.push(`duplicate method/path ${route}`);
    routes.add(route);
    if (!allowed.has(row.disposition)) findings.push(`invalid disposition ${row.disposition}`);
    if (row.disposition === "CORE_REQUIRED" && (!row.tickets || !row.capabilities)) {
      findings.push(`${row.id}: CORE_REQUIRED requires capability_ids and ticket_ids`);
    }
    if (["STRETCH", "POST_MVP"].includes(row.disposition) && row.tickets) {
      findings.push(`${row.id}: deferred endpoint must not map an MVP ticket`);
    }
  }
  const dispositionCount = (value) => rows.filter((row) => row.disposition === value).length;
  for (const [value, expected] of Object.entries({
    CORE_REQUIRED: 37,
    CORE_OPTIONAL: 4,
    STRETCH: 11,
    POST_MVP: 3
  })) {
    if (dispositionCount(value) !== expected) {
      findings.push(`${value}: expected ${expected}, found ${dispositionCount(value)}`);
    }
  }
  return findings;
}

const endpointFindings = validateEndpointRegistry(endpointMap);
for (const finding of endpointFindings) {
  errors.push(`${endpointMapPath}: ${finding}`);
}
const registryRoutes = new Set(
  [...endpointMap.matchAll(/method: ([A-Z]+), path: "([^"]+)"/g)]
    .map((match) => `${match[1]} ${match[2]}`)
);
const backlogRoutes = new Set(
  [...apiBacklog.matchAll(/^\| (GET|POST|PATCH|DELETE) \| `([^`]+)` \|/gm)]
    .map((match) => {
      const canonicalPath = `/api/v1${match[2]}`.replace(/:([A-Za-z][A-Za-z0-9]*)/g, "{$1}");
      return `${match[1]} ${canonicalPath}`;
    })
);
if (backlogRoutes.size !== 55) errors.push(`API backlog must contain 55 unique rows; found ${backlogRoutes.size}`);
for (const route of backlogRoutes) {
  if (!registryRoutes.has(route)) errors.push(`Backlog route has no canonical mapping: ${route}`);
}
for (const route of registryRoutes) {
  if (!backlogRoutes.has(route)) errors.push(`Registry route has no backlog projection: ${route}`);
}
const priorityCounts = Object.fromEntries(
  ["Must", "Should", "Could"].map((priority) => [
    priority,
    (apiBacklog.match(new RegExp(`\\| ${priority} \\|`, "g")) ?? []).length
  ])
);
if (priorityCounts.Must !== 46 || priorityCounts.Should !== 6 || priorityCounts.Could !== 3) {
  errors.push(`Backlog priority rows expected 46/6/3, found ${priorityCounts.Must}/${priorityCounts.Should}/${priorityCounts.Could}`);
}
if (!endpointSchema.includes('"const": 55')) {
  errors.push("Endpoint registry schema must lock endpoint_count to 55");
}
for (const marker of ["API-COM-007", "55 endpoint", "payOS"]) {
  if (!apiContract.includes(marker)) errors.push(`API contract missing CCR-005 marker '${marker}'`);
}
for (const marker of ["TRC-001", "TRC-002", "TRC-003"]) {
  if (!qualityContract.includes(marker)) errors.push(`Quality contract missing '${marker}'`);
}
if (!securityContract.includes("raw body, prompt chứa PII, signature, token, secret và internal URL bị cấm")) {
  errors.push("Security contract must forbid raw sensitive operational/AI log output");
}

try {
  const fixtures = JSON.parse(negativeCases);
  for (const fixture of fixtures.cases ?? []) {
    const source = fixture.target === "security" ? securityContract : endpointMap;
    const mutated = source.replace(fixture.find, fixture.replace);
    if (mutated === source) {
      errors.push(`Negative fixture '${fixture.id}' does not mutate the registry`);
    } else {
      const rejected = fixture.target === "security"
        ? !mutated.includes("raw body, prompt chứa PII, signature, token, secret và internal URL bị cấm")
        : validateEndpointRegistry(mutated).length > 0;
      if (!rejected) errors.push(`Negative fixture '${fixture.id}' was not rejected`);
    }
  }
} catch (error) {
  errors.push(`Invalid negative fixture JSON: ${error.message}`);
}

if (errors.length > 0) {
  console.error("Control-plane validation: FAILED");
  for (const error of errors) console.error(`- ${error}`);
  for (const warning of warnings) console.warn(`- warning: ${warning}`);
  process.exit(1);
}

console.log("Control-plane validation: PASSED");
console.log(`- effective baseline: ${baseline}`);
console.log(`- current stage: ${stage}`);
console.log(`- authorized ticket: ${workTicket ?? "none"}`);
console.log(`- candidate ticket: ${workCandidate ?? "none"}`);
console.log(`- next action: ${workAction}`);
console.log(`- learning lesson specs: ${lessonCapabilityIds.size}/${capabilityIds.size}`);
console.log(`- learning gate references: ${gateIds.size}/35`);
console.log(`- reference profiles: ${profileLinks.size}`);
console.log("- endpoint registry: 55/55");
console.log("- endpoint negative fixtures: passed");
console.log("- coding checkpoint fixtures: passed");
for (const warning of warnings) console.warn(`- warning: ${warning}`);
