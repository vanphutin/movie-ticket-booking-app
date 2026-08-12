import fs from "node:fs";
import { JSDOM } from "jsdom";
import { buildDashboard } from "./build-master-dashboard.mjs";

const path = "docs/plan/movie-ticket-booking-master-plan.html";
const html = fs.readFileSync(path, "utf8");
const errors = [];
if (html !== buildDashboard()) errors.push("Dashboard differs from canonical generated output");
const dom = new JSDOM(html);
const document = dom.window.document;
const dataNode = document.querySelector("#dashboard-data");
let data;
try { data = JSON.parse(dataNode?.textContent ?? ""); } catch { errors.push("Embedded dashboard JSON is invalid"); }
if (data) {
  if (data.backend.length !== 35) errors.push(`Expected 35 backend tickets, found ${data.backend.length}`);
  if (data.frontend.length !== 44) errors.push(`Expected 44 frontend tickets, found ${data.frontend.length}`);
  if (data.capabilities.length !== 22) errors.push(`Expected 22 frontend capabilities, found ${data.capabilities.length}`);
  if (data.dependencies.length !== 7 || data.coverage.length !== 7) errors.push("Expected seven dependency and coverage mappings");
  if (data.counts.total !== 79) errors.push(`Expected 79 total tickets, found ${data.counts.total}`);
  if (data.meta.activeWorkstream !== "frontend") errors.push("Dashboard active workstream differs from router");
  if (data.meta.fe.candidate !== "FE-TKT-FND-CSS-D01") errors.push("Dashboard candidate differs from canonical frontend state");
}
for (const selector of ["form", "input", "button", "select", "textarea", "[contenteditable]"]) if (document.querySelector(selector)) errors.push(`Read-only dashboard contains forbidden control ${selector}`);
if (/\b(?:localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest|method\s*:\s*["'](?:POST|PUT|PATCH|DELETE))/i.test(html)) errors.push("Dashboard contains a stateful or network mutation surface");
if (/opaque-(?:access|refresh)-token|correct horse battery staple/i.test(html)) errors.push("Dashboard embeds credential-like example data");
if (document.querySelectorAll("script[src],link[rel=stylesheet]").length) errors.push("Standalone dashboard has external runtime assets");
if (!html.includes("prefers-reduced-motion:reduce")) errors.push("Dashboard lacks reduced-motion support");

if (process.argv.includes("--self-test")) {
  const fixtures = [
    html.replace('"total":79', '"total":78'),
    html.replace('"activeWorkstream":"frontend"', '"activeWorkstream":"backend"'),
    html.replace("</main>", '<form><button>Mutate</button></form></main>'),
    html.replace("</main>", '<script>localStorage.setItem("status","VERIFIED")</script></main>'),
  ];
  const rejected = fixtures.every((fixture) => fixture !== buildDashboard());
  if (!rejected) { console.error("Master dashboard self-test: FAILED"); process.exit(1); }
  console.log(`Master dashboard self-test: PASSED (${fixtures.length} drift cases)`);
}
if (errors.length) {
  console.error("Master dashboard: FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("Master dashboard: PASSED");
console.log("- 35 backend tickets + 44 frontend tickets = 79");
console.log("- standalone, deterministic and read only");
