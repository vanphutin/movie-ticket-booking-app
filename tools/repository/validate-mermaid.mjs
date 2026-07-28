import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { JSDOM } from "jsdom";

const root = process.cwd();
const requestedPaths = process.argv.slice(2).filter((argument) => argument !== "--self-test");
const ignoredDirectories = new Set([".git", ".agents", ".claude", "node_modules", "docs-viewer"]);

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
const { default: mermaid } = await import("mermaid");

if (process.argv.includes("--self-test")) {
  try {
    await mermaid.parse("sequenceDiagram\nGateway->>");
  } catch {
    console.log("Mermaid validator self-test: PASSED (invalid syntax was rejected)");
    process.exit(0);
  }
  console.error("Mermaid validator self-test: FAILED (invalid syntax was accepted)");
  process.exit(1);
}

function walk(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return path.extname(target).toLowerCase() === ".md" ? [target] : [];

  const files = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(target, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else if (path.extname(entry.name).toLowerCase() === ".md") files.push(absolute);
  }
  return files;
}

function diagramLine(content, matchIndex) {
  return content.slice(0, matchIndex).split(/\r?\n/).length;
}

const targets = requestedPaths.length > 0
  ? requestedPaths.map((target) => path.resolve(root, target))
  : [root];
const files = [...new Set(targets.flatMap(walk))].sort();
const failures = [];
let diagramCount = 0;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  for (const match of content.matchAll(/```mermaid[^\S\r\n]*\r?\n([\s\S]*?)```/gi)) {
    diagramCount += 1;
    try {
      await mermaid.parse(match[1]);
    } catch (error) {
      const relative = path.relative(root, file);
      const message = String(error?.str || error?.message || error).trim();
      failures.push(`${relative}:${diagramLine(content, match.index)}\n${message}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Mermaid syntax (10.9.6): FAILED (${failures.length}/${diagramCount})`);
  for (const failure of failures) console.error(`\n${failure}`);
  process.exit(1);
}

console.log(`Mermaid syntax (10.9.6): PASSED (${diagramCount} diagrams)`);
