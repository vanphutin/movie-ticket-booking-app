import fs from "node:fs";
import process from "node:process";

const paths = {
  catalog: "clients/contracts/roadmap/ticket-catalog.yml",
  capabilities: "clients/contracts/roadmap/capability-map.yml",
  integration: "clients/contracts/integration/backend-capability-map.yml",
  phases: "clients/contracts/roadmap/phases.yml",
  milestones: "clients/contracts/roadmap/milestones.yml",
  candidate: "clients/contracts/tickets/FE-TKT-FND-CSS-D01.yml",
  backendState: "AI-contracts/state/current-work.yml",
};

const read = (file) => {
  if (!fs.existsSync(file)) throw new Error(`Missing roadmap path: ${file}`);
  return fs.readFileSync(file, "utf8");
};
const list = (value = "") => value.split(",").map((item) => item.trim()).filter(Boolean);
const scalar = (text, key) => text.match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, "m"))?.[1]?.replace(/^["']|["']$/g, "");

function validate(inputs) {
  const errors = [];
  const ticketPattern = /^  - \{ id: (FE-TKT-[^,]+), track: ([^,]+), phase: ([^,]+), capabilities: \[([^\]]*)\], prerequisites: \[([^\]]*)\], backend_gate: ([^,]+), target: ([^,]+), outcome: ([^,]+), acceptance: \[([^\]]*)\], next: ([^,]+), status: ([^ }]+) \}$/gm;
  const tickets = [...inputs.catalog.matchAll(ticketPattern)].map((m) => ({
    id: m[1], track: m[2], phase: m[3], capabilities: list(m[4]), prerequisites: list(m[5]),
    backendGate: m[6], target: m[7], outcome: m[8], acceptance: list(m[9]), next: m[10], status: m[11],
  }));
  const ids = tickets.map((ticket) => ticket.id);
  const idSet = new Set(ids);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) errors.push(`Duplicate ticket IDs: ${[...new Set(duplicateIds)].join(", ")}`);

  const gatePattern = /^  - \{ id: (FE-W\d+-VERIFIED), requires: \[([^\]]+)\], returns_to: ([^ }]+) \}$/gm;
  const gates = [...inputs.catalog.matchAll(gatePattern)].map((m) => ({ id: m[1], requires: list(m[2]), returnsTo: m[3] }));
  const gateSet = new Set(gates.map((gate) => gate.id));
  const knownPrerequisites = new Set([...ids, ...gateSet]);
  const phaseIds = new Set([...inputs.phases.matchAll(/^  - \{ id: (FE-P\d+),/gm)].map((m) => m[1]));
  const validTargets = new Set(["C3_APPLY", "C4_DEBUG", "C5_COMPARE", "C6_DEFEND", "C7_LEAD"]);
  const validStatuses = new Set(["PLANNED", "ELIGIBLE", "AUTHORIZED", "IN_PROGRESS", "VERIFIED", "BLOCKED"]);

  for (const ticket of tickets) {
    for (const prerequisite of ticket.prerequisites) {
      if (!knownPrerequisites.has(prerequisite)) errors.push(`${ticket.id} has missing prerequisite ${prerequisite}`);
    }
    if (!phaseIds.has(ticket.phase)) errors.push(`${ticket.id} references unknown phase ${ticket.phase}`);
    if (!validTargets.has(ticket.target)) errors.push(`${ticket.id} has invalid target ${ticket.target}`);
    if (!validStatuses.has(ticket.status)) errors.push(`${ticket.id} has invalid status ${ticket.status}`);
    if (!ticket.outcome.trim() || ticket.acceptance.length === 0) errors.push(`${ticket.id} lacks outcome or acceptance summary`);
    if (ticket.next.startsWith("FE-TKT-") && !idSet.has(ticket.next)) errors.push(`${ticket.id} points to missing next ticket ${ticket.next}`);
    if (ticket.track === "PRODUCT" && !ticket.backendGate.startsWith("BE-W")) errors.push(`${ticket.id} product ticket lacks backend gate`);
    if (ticket.track !== "PRODUCT" && ticket.backendGate !== "NONE_FOUNDATION_ONLY") errors.push(`${ticket.id} foundation/governance ticket has a product backend gate`);
  }

  const capabilityRows = [...inputs.capabilities.matchAll(/^  - \{ id: (FE-CAP-[A-Z0-9]+), name: [^,]+, prerequisites: \[([^\]]*)\], target_level: ([^,]+), mandatory: (true|false), covered_by: \[([^\]]*)\] \}$/gm)]
    .map((m) => ({ id: m[1], prerequisites: list(m[2]), target: m[3], mandatory: m[4] === "true", coveredBy: list(m[5]) }));
  const capabilitySet = new Set(capabilityRows.map((capability) => capability.id));
  for (const capability of capabilityRows) {
    for (const prerequisite of capability.prerequisites) if (!capabilitySet.has(prerequisite)) errors.push(`${capability.id} has unknown prerequisite ${prerequisite}`);
    for (const ticketId of capability.coveredBy) if (!idSet.has(ticketId)) errors.push(`${capability.id} covered_by references missing ticket ${ticketId}`);
    if (capability.mandatory && !tickets.some((ticket) => ticket.capabilities.includes(capability.id))) errors.push(`Mandatory capability has no ticket coverage: ${capability.id}`);
    if (!validTargets.has(capability.target)) errors.push(`${capability.id} has invalid target ${capability.target}`);
  }
  for (const ticket of tickets) for (const capability of ticket.capabilities) if (!capabilitySet.has(capability)) errors.push(`${ticket.id} references unknown capability ${capability}`);

  const dependencyPattern = /^  - \{ backend_gate: ([^,]+), backend_tickets: \[([^\]]+)\], backend_status: ([^,]+), source: ([^,]+), frontend_week: (FE-W\d+), public_boundary: ([^}]+) \}$/gm;
  const dependencies = [...inputs.integration.matchAll(dependencyPattern)].map((m) => ({
    gate: m[1], tickets: list(m[2]), status: m[3], source: m[4], frontendWeek: m[5], boundary: m[6].trim(),
  }));
  const dependencyByGate = new Map(dependencies.map((dependency) => [dependency.gate, dependency]));
  for (const dependency of dependencies) {
    if (!fs.existsSync(dependency.source)) errors.push(`${dependency.gate} source does not exist: ${dependency.source}`);
    const source = fs.existsSync(dependency.source) ? read(dependency.source) : "";
    const authority = dependency.status === "VERIFIED" ? `${source}\n${inputs.backendState}` : source;
    for (const backendTicket of dependency.tickets) if (!authority.includes(backendTicket)) errors.push(`${dependency.gate} authority does not mention ${backendTicket}`);
    if (dependency.status === "VERIFIED" && !/review:\s*(?:APPROVED|VERIFIED)/.test(inputs.backendState)) errors.push(`${dependency.gate} lacks verified backend review authority`);
    if (!dependency.boundary) errors.push(`${dependency.gate} lacks a public boundary`);
  }

  for (let week = 4; week <= 10; week += 1) {
    const padded = String(week).padStart(2, "0");
    const weekTickets = tickets.filter((ticket) => ticket.id.startsWith(`FE-TKT-W${padded}-`));
    const gate = gates.find((item) => item.id === `FE-W${padded}-VERIFIED`);
    if (weekTickets.length !== 5) errors.push(`FE-W${padded} must contain five product tickets; found ${weekTickets.length}`);
    if (!gate) errors.push(`Missing FE-W${padded} weekly gate`);
    else {
      const expected = weekTickets.map((ticket) => ticket.id).sort().join(",");
      if ([...gate.requires].sort().join(",") !== expected) errors.push(`${gate.id} does not require exactly its five week tickets`);
      const expectedReturn = week === 10 ? "RELEASE-DECISION" : `BE-W${String(week + 1).padStart(2, "0")}`;
      if (gate.returnsTo !== expectedReturn) errors.push(`${gate.id} returns to ${gate.returnsTo}, expected ${expectedReturn}`);
    }
    const dependency = dependencies.find((item) => item.frontendWeek === `FE-W${padded}`);
    if (!dependency) errors.push(`FE-W${padded} lacks backend dependency mapping`);
    for (const ticket of weekTickets) if (!dependency || ticket.backendGate !== dependency.gate) errors.push(`${ticket.id} backend gate does not match FE-W${padded}`);
    const first = weekTickets.find((ticket) => ticket.id.endsWith("D01"));
    if (week > 4 && first && !first.prerequisites.includes(`FE-W${String(week - 1).padStart(2, "0")}-VERIFIED`)) errors.push(`${first.id} lacks prior frontend weekly gate`);
    const last = weekTickets.find((ticket) => ticket.id.endsWith("D05"));
    const expectedNext = week === 10 ? "RELEASE-DECISION" : `RETURN-BE-W${String(week + 1).padStart(2, "0")}`;
    if (last?.next !== expectedNext) errors.push(`${last?.id ?? `FE-W${padded}`} has invalid return transition`);
  }

  const phaseExits = [...inputs.phases.matchAll(/exit: ([^ }]+)(?: VERIFIED)? \}/g)].map((m) => m[1]);
  for (const exit of phaseExits) if (!idSet.has(exit) && !gateSet.has(exit)) errors.push(`Phase exit references unknown gate/ticket ${exit}`);
  if ([...inputs.milestones.matchAll(/^  - \{ id: FE-M\d+, outcome: [^}]+ \}$/gm)].length < 6) errors.push("Milestone registry is incomplete");
  if (tickets.length !== 44) errors.push(`Catalog must contain exactly 44 tickets; found ${tickets.length}`);
  if (capabilityRows.length !== 22) errors.push(`Capability map must contain exactly 22 capabilities; found ${capabilityRows.length}`);
  if (dependencies.length !== 7 || gates.length !== 7) errors.push("Roadmap must contain exactly seven backend dependencies and seven frontend weekly gates");

  const candidate = tickets.find((ticket) => ticket.id === scalar(inputs.candidate, "ticket_id"));
  if (!candidate) errors.push("Materialized candidate is absent from the catalog");
  else {
    if (scalar(inputs.candidate, "status") !== "CANDIDATE") errors.push("Materialized successor must remain CANDIDATE before authorization");
    if (scalar(inputs.candidate, "phase_id") !== candidate.phase) errors.push("Materialized candidate phase differs from catalog");
    if (scalar(inputs.candidate, "backend_gate") !== candidate.backendGate) errors.push("Materialized candidate backend gate differs from catalog");
    if (scalar(inputs.candidate, "next_ticket") !== candidate.next) errors.push("Materialized candidate next ticket differs from catalog");
  }
  return { errors, ticketCount: tickets.length, capabilityCount: capabilityRows.length, backendGateCount: dependencies.length, weeklyGateCount: gates.length };
}

const inputs = Object.fromEntries(Object.entries(paths).map(([key, file]) => [key, read(file)]));
const result = validate(inputs);
if (process.argv.includes("--self-test")) {
  const mutations = [
    ["unknown backend gate", { ...inputs, catalog: inputs.catalog.replace("BE-W04-AUTH-VERIFIED", "BE-W99-UNKNOWN") }],
    ["broken next chain", { ...inputs, catalog: inputs.catalog.replace("next: FE-TKT-FND-CSS-D02", "next: FE-TKT-MISSING") }],
    ["wrong weekly return", { ...inputs, catalog: inputs.catalog.replace("returns_to: BE-W05", "returns_to: BE-W09") }],
    ["unknown phase exit", { ...inputs, phases: inputs.phases.replace("FE-W05-VERIFIED", "FE-W99-VERIFIED") }],
    ["missing backend source ticket", { ...inputs, integration: inputs.integration.replace("TKT-W05-D05", "TKT-W05-D99") }],
  ];
  for (const [name, broken] of mutations) if (validate(broken).errors.length === 0) {
    console.error(`Frontend roadmap self-test FAILED: ${name}`);
    process.exit(1);
  }
  console.log(`Frontend roadmap self-test: PASSED (${mutations.length} negative cases)`);
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
