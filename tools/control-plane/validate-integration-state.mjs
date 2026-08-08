import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const errors = [];

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
  return match?.[1]?.replace(/^['"]|['"]$/g, "");
}

function nestedScalar(text, parent, key) {
  const match = text.match(new RegExp(`^${parent}:\\s*$([\\s\\S]*?)(?=^[^ \\r\\n][^:]*:|\\s*$)`, "m"));
  return scalar(match?.[1] ?? "", key);
}

function modelFindings(model) {
  const findings = [];
  if (model.maxStackDepth !== 2) findings.push("maximum stack depth must be 2");
  if (model.status === "PENDING_BOOTSTRAP" && model.developCreationAuthorized) {
    findings.push("develop creation is prohibited during bootstrap");
  }
  if (model.status === "PENDING_BOOTSTRAP" && model.newRemoteStackLayerAuthorized) {
    findings.push("new remote stack layers are prohibited during bootstrap");
  }
  return findings;
}

const integrationState = read("AI-contracts/state/integration-state.yml");
const currentWork = read("AI-contracts/state/current-work.yml");
const contractStatus = read("AI-contracts/state/contract-status.yml");
read("AI-contracts/schemas/integration-state.schema.json");

for (const [key, expected] of [
  ["change_request_id", "CCR-013"],
  ["effective_baseline", "PC-2026.11"],
  ["daily_integration_branch", "develop"],
  ["release_branch", "main"],
  ["new_work_base", "origin/develop"],
  ["bootstrap_base", "origin/main"]
]) {
  if (scalar(integrationState, key) !== expected) errors.push(`${key} must be ${expected}`);
}

const model = {
  status: scalar(integrationState, "status"),
  maxStackDepth: Number(scalar(integrationState, "max_stack_depth")),
  developCreationAuthorized: nestedScalar(integrationState, "bootstrap", "develop_creation_authorized") === "true",
  newRemoteStackLayerAuthorized: nestedScalar(integrationState, "bootstrap", "new_remote_stack_layer_authorized") === "true"
};
errors.push(...modelFindings(model));

if (scalar(currentWork, "effective_baseline") !== "PC-2026.11") {
  errors.push("current-work baseline must be PC-2026.11");
}
if (scalar(contractStatus, "effective_baseline") !== "PC-2026.11") {
  errors.push("contract-status baseline must be PC-2026.11");
}
if (!/^\s+- CCR-013\s*$/m.test(currentWork)) errors.push("current ticket projection must reference CCR-013");
if (!/^\s+- id: CCR-013\s*$/m.test(contractStatus)) errors.push("contract status must record CCR-013 approval");

try {
  const fixtures = JSON.parse(read("tools/control-plane/fixtures/integration-state-cases.json"));
  for (const fixture of fixtures.cases ?? []) {
    const accepted = modelFindings(fixture).length === 0;
    if (accepted !== fixture.expectedValid) errors.push(`fixture ${fixture.id} produced unexpected result`);
  }
} catch (error) {
  errors.push(`invalid integration-state fixtures: ${error.message}`);
}

if (errors.length) {
  console.error("Integration-state validation: FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Integration-state validation: PASSED");
console.log(`- status: ${model.status}`);
console.log("- daily integration branch: develop");
console.log("- maximum normal stack depth: 2");
