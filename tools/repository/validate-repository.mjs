import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const errors = [];
const warnings = [];

function runNode(relativeScript, args = []) {
  const result = spawnSync(process.execPath, [relativeScript, ...args], {
    cwd: root,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    errors.push(
      `${relativeScript} ${args.join(" ")} failed:\n${(result.stderr || result.stdout).trim()}`
    );
  }
}

function walk(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", ".agents", ".claude", "node_modules"].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(absolute));
    else output.push(absolute);
  }
  return output;
}

function isIgnoredReference(reference) {
  return (
    !reference ||
    reference.startsWith("#") ||
    reference.startsWith("http://") ||
    reference.startsWith("https://") ||
    reference.startsWith("mailto:") ||
    reference.startsWith("data:") ||
    reference.startsWith("file:")
  );
}

function resolveLocalReference(sourceFile, reference) {
  const clean = decodeURIComponent(reference.split("#")[0].split("?")[0]);
  if (!clean) return null;
  return path.isAbsolute(clean)
    ? path.join(root, clean.replace(/^[/\\]+/, ""))
    : path.resolve(path.dirname(sourceFile), clean);
}

function checkReference(sourceFile, reference) {
  if (isIgnoredReference(reference)) return;
  const target = resolveLocalReference(sourceFile, reference);
  if (target && !fs.existsSync(target)) {
    errors.push(
      `${path.relative(root, sourceFile)} references missing local target '${reference}'`
    );
  }
}

runNode("tools/control-plane/sync-control-plane.mjs", ["--check"]);
runNode("tools/control-plane/validate-control-plane.mjs");
runNode("tools/frontend-control-plane/validate-frontend-control-plane.mjs");
runNode("tools/control-plane/validate-master-dashboard.mjs");
runNode("tools/repository/validate-mermaid.mjs");
runNode("tools/repository/validate-work-unit-transition.mjs");

const registryPath = path.join(root, "tools/control-plane/generated-targets.json");
try {
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  for (const target of registry.targets ?? []) {
    const absolute = path.join(root, target.path);
    if (!fs.existsSync(absolute)) errors.push(`Generated target is missing: ${target.path}`);
    if (target.ownership === "delimited-region") {
      const content = fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
      for (const boundary of ["START", "END"]) {
        if (!content.includes(`<!-- GENERATED:${target.region}:${boundary} -->`)) {
          errors.push(`${target.path}: missing generated ${target.region} ${boundary} marker`);
        }
      }
    }
  }
} catch (error) {
  errors.push(`Invalid generated target registry: ${error.message}`);
}

const files = walk(root);
for (const file of files) {
  const extension = path.extname(file).toLowerCase();
  if (![".md", ".html", ".css"].includes(extension)) continue;
  const content = fs.readFileSync(file, "utf8");
  const historicalProjection = content.includes("Đây là projection legacy");
  if (extension === ".md") {
    if (historicalProjection) {
      warnings.push(
        `${path.relative(root, file)} is a declared legacy projection; its historical study links were not treated as current targets.`
      );
      continue;
    }
    for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      checkReference(file, match[1].replace(/^<|>$/g, ""));
    }
  }
  if (extension === ".html") {
    for (const match of content.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
      checkReference(file, match[1]);
    }
  }
  if (extension === ".css") {
    for (const match of content.matchAll(/\burl\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
      checkReference(file, match[1]);
    }
  }
}

if (!fs.existsSync(path.join(root, "package.json"))) {
  warnings.push("Application module tooling is not available; no app lint/typecheck/test was claimed.");
}

if (errors.length > 0) {
  console.error("Repository consistency: FAILED");
  for (const error of errors) console.error(`- ${error}`);
  for (const warning of warnings) console.warn(`- warning: ${warning}`);
  process.exit(1);
}

console.log("Repository consistency: PASSED");
console.log("- generated projections: synchronized");
console.log("- control plane: valid");
console.log("- Mermaid 10.9.6 syntax: valid");
console.log("- work-unit publication checkpoint: valid");
console.log("- Markdown/HTML/CSS local references: valid");
for (const warning of warnings) console.warn(`- warning: ${warning}`);
