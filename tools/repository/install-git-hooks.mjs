import { spawnSync } from "node:child_process";
import process from "node:process";

const result = spawnSync("git", ["config", "--local", "core.hooksPath", ".githooks"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: "inherit"
});
if (result.status !== 0) process.exit(result.status ?? 1);
console.log("Git hooks enabled for this clone: .githooks");
