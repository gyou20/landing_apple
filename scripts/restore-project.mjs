import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const reportDirectory = path.join(projectRoot, ".restore");
const timestamp = new Date().toISOString().replaceAll(":", "-");
const logPath = path.join(reportDirectory, `restore-${timestamp}.log`);
const minimumNode = [22, 13, 0];

mkdirSync(reportDirectory, { recursive: true });

function log(message, details) {
  const line = `[${new Date().toISOString()}] ${message}${details === undefined ? "" : ` ${JSON.stringify(details)}`}`;
  console.info(line);
  appendFileSync(logPath, `${line}\n`, "utf8");
}

function versionAtLeast(actual, minimum) {
  for (let index = 0; index < minimum.length; index += 1) {
    if ((actual[index] ?? 0) > minimum[index]) return true;
    if ((actual[index] ?? 0) < minimum[index]) return false;
  }
  return true;
}

async function runStage(name, command, args) {
  log("stage:start", { name, command, args });
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: process.env,
    shell: process.platform === "win32" && command.endsWith(".cmd"),
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    appendFileSync(logPath, chunk);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    appendFileSync(logPath, chunk);
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });

  log("stage:complete", { name, exitCode });
  if (exitCode !== 0) throw new Error(`${name} failed with exit code ${exitCode}`);
}

try {
  const nodeVersion = process.versions.node.split(".").map(Number);
  log("restore:start", {
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
    projectRoot,
  });

  if (!versionAtLeast(nodeVersion, minimumNode)) {
    throw new Error(`Node.js >=${minimumNode.join(".")} is required.`);
  }
  if (!existsSync(path.join(projectRoot, "package-lock.json"))) {
    throw new Error("package-lock.json is missing; reproducible install is unavailable.");
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  await runStage("install locked dependencies", npmCommand, ["ci"]);
  await runStage("production build", npmCommand, ["run", "build"]);
  await runStage("static analysis", npmCommand, ["run", "lint"]);
  await runStage("restore verification", process.execPath, ["scripts/verify-restored-project.mjs"]);

  log("restore:success", { logPath });
  console.info(`\nRestore verified. Diagnostic log: ${logPath}`);
} catch (error) {
  log("restore:failure", {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : String(error),
  });
  console.error(`\nRestore failed. Diagnostic log: ${logPath}`);
  process.exit(1);
}