import { spawnSync } from "node:child_process";
import process from "node:process";

const root = process.cwd();
const stagedResult = spawnSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
  cwd: root,
  encoding: "utf8"
});

if (stagedResult.status !== 0) {
  console.error(stagedResult.stderr.trim());
  process.exit(stagedResult.status ?? 1);
}

const staged = stagedResult.stdout.split(/\r?\n/).filter(Boolean);
if (staged.length === 0) process.exit(0);

function stream(file) {
  if (file.startsWith("apps/")) return "PRODUCT_CODE";
  if (file.startsWith("AI-contracts/contracts/") || file.startsWith("AI-contracts/changes/")) {
    return "PRODUCT_CONTRACT";
  }
  if (
    file.startsWith("AI-contracts/state/") ||
    file.startsWith("AI-contracts/audits/") ||
    file === "AGENTS.md" ||
    file === "CODEX-CONTEXT.md"
  ) return "CONTROL_PLANE";
  if (file.startsWith("AI-contracts/learning/")) return "LEARNING";
  if (file.startsWith("AI-contracts/viewer/") || file.startsWith("docs-viewer/")) {
    return "DOCS_TOOLING";
  }
  if (file.startsWith("docs/")) return "PROJECT_DOCS";
  if (
    file.startsWith("tools/") ||
    file.startsWith(".github/") ||
    file.startsWith(".githooks/") ||
    file === "package.json"
  ) return "REPOSITORY_TOOLING";
  return "CONTROL_PLANE";
}

const streams = new Set(staged.map(stream));
if (streams.has("PRODUCT_CODE") && [...streams].some((value) => value !== "PRODUCT_CODE")) {
  console.error("Pre-commit: PRODUCT_CODE cannot be mixed with another commit stream.");
  process.exit(1);
}

const validation = spawnSync(process.execPath, ["tools/repository/validate-repository.mjs"], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit"
});
process.exit(validation.status ?? 1);
