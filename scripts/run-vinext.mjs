import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const vinextCli = path.join(projectRoot, "node_modules", "vinext", "dist", "cli.js");
const wranglerLog = path.join(projectRoot, ".wrangler", "wrangler.log");
const args = process.argv.slice(2);

console.info("[run-vinext] start", {
  platform: process.platform,
  node: process.version,
  command: args[0] ?? null,
  cliFound: existsSync(vinextCli),
  wranglerLog,
});

if (!existsSync(vinextCli)) {
  console.error("[run-vinext] Vinext is not installed. Run `npm ci` first.");
  process.exit(1);
}

const result = spawnSync(process.execPath, [vinextCli, ...args], {
  cwd: projectRoot,
  env: {
    ...process.env,
    WRANGLER_LOG_PATH: wranglerLog,
  },
  stdio: "inherit",
});

if (result.error) {
  console.error("[run-vinext] failed to start", {
    name: result.error.name,
    message: result.error.message,
  });
  process.exit(1);
}

console.info("[run-vinext] complete", { exitCode: result.status ?? 1 });
process.exit(result.status ?? 1);
