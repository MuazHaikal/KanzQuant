import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const venvPython = process.platform === "win32"
  ? resolve(".venv", "Scripts", "python.exe")
  : resolve(".venv", "bin", "python");
const python = existsSync(venvPython) ? venvPython : "python";
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Python script or module arguments are required.");
  process.exit(2);
}

const result = spawnSync(python, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  shell: false,
});

if (result.error) {
  console.error(`Unable to start the project Python runtime: ${result.error.message}`);
  process.exit(2);
}
process.exit(result.status ?? 1);
