import fs from "node:fs";
import process from "node:process";

const catalogPath = "clients/contracts/roadmap/ticket-catalog.yml";
const capabilityPath = "clients/contracts/roadmap/capability-map.yml";
const integrationPath = "clients/contracts/integration/backend-capability-map.yml";

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`Missing roadmap path: ${path}`);
  return fs.readFileSync(path, "utf8");
}

function values(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

function list(value = "") {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function validate(catalog, capabilities, integration) {
  const errors = [];
  const ticketRows = [...catalog.matchAll(/^  - \{ id: (FE-TKT-[^,]+), track: ([^,]+), phase: ([^,]+), capabilities: \[([^\]]*)\], prerequisites: \[([^\]]*)\], backend_gate: ([^,]+),/gm)]
    .map((m) => ({ id: m[1], track: m[2], phase: m[3], capabilities: list(m[4]), prerequisites: list(m[5]), backendGate: m[6] }));
  const ids = ticketRows.map((row) => row.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) errors.push(`Duplicate ticket IDs: ${[...new Set(duplicateIds)].join(", ")}`);

  const weeklyGates = new Set(values(catalog, /^  - \{ id: (FE-W\d+-VERIFIED), requires:/gm));
  const knownPrerequisites = new Set([...ids, ...weeklyGates]);
  for (const row of ticketRows) {
    for (const prerequisite of row.prerequisites) {
      if (!knownPrerequisites.has(prerequisite)) errors.push(`${row.id} has missing prerequisite ${prerequisite}`);
    }
    if (row.track === "PRODUCT" && !row.backendGate.startsWith("BE-W")) {
      errors.push(`${row.id} product ticket lacks backend gate`);
    }
  }

  const capabilityIds = values(capabilities, /- \{ id: (FE-CAP-[A-Z0-9]+),/g);
  for (const capabilityId of capabilityIds) {
    if (!ticketRows.some((row) => row.capabilities.includes(capabilityId))) {
      errors.push(`Mandatory capability has no ticket coverage: ${capabilityId}`);
    }
  }
  for (const row of ticketRows) {
    for (const capabilityId of row.capabilities) {
      if (!capabilityIds.includes(capabilityId)) errors.push(`${row.id} references unknown capability ${capabilityId}`);
    }
  }

  const backendGates = new Set(values(integration, /backend_gate: (BE-W[^,}]+)/g));
  for (const row of ticketRows.filter((ticket) => ticket.track === "PRODUCT")) {
    if (!backendGates.has(row.backendGate)) errors.push(`${row.id} references unknown backend gate ${row.backendGate}`);
  }

  for (let week = 4; week <= 10; week += 1) {
    const weekRows = ticketRows.filter((row) => row.id.startsWith(`FE-TKT-W${String(week).padStart(2, "0")}-`));
    if (weekRows.length !== 5) errors.push(`FE-W${week} must contain five product tickets; found ${weekRows.length}`);
    if (!weeklyGates.has(`FE-W${String(week).padStart(2, "0")}-VERIFIED`)) errors.push(`Missing FE-W${week} weekly gate`);
  }
  if (ticketRows.length < 40) errors.push(`Catalog is incomplete; expected at least 40 tickets, found ${ticketRows.length}`);
  return { errors, ticketCount: ticketRows.length, capabilityCount: capabilityIds.length, backendGateCount: backendGates.size, weeklyGateCount: weeklyGates.size };
}

const result = validate(read(catalogPath), read(capabilityPath), read(integrationPath));
if (process.argv.includes("--self-test")) {
  const broken = read(catalogPath).replace("backend_gate: BE-W04-AUTH-VERIFIED", "backend_gate: BE-W99-UNKNOWN");
  const negative = validate(broken, read(capabilityPath), read(integrationPath));
  if (negative.errors.length === 0) {
    console.error("Frontend roadmap self-test: FAILED");
    process.exit(1);
  }
  console.log("Frontend roadmap self-test: PASSED");
}
if (result.errors.length) {
  console.error("Frontend roadmap: FAILED");
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("Frontend roadmap: PASSED");
console.log(`- tickets: ${result.ticketCount}`);
console.log(`- capabilities: ${result.capabilityCount}`);
console.log(`- backend gates: ${result.backendGateCount}`);
console.log(`- weekly gates: ${result.weeklyGateCount}`);
