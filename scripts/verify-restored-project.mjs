import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const failures = [];
const warnings = [];
const requiredPaths = [
  ".openai/hosting.json",
  "app/admin/page.tsx",
  "app/home/page.tsx",
  "db/schema.ts",
  "dist/client",
  "dist/server/index.js",
  "package-lock.json",
  "public",
  "worker/index.ts",
];

for (const relativePath of requiredPaths) {
  if (!existsSync(path.join(projectRoot, relativePath))) failures.push(`Missing required path: ${relativePath}`);
}

const packageJson = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8"));
const expectedPackages = { ...packageJson.dependencies, ...packageJson.devDependencies };
for (const [packageName, expectedVersion] of Object.entries(expectedPackages)) {
  const installedManifest = path.join(projectRoot, "node_modules", ...packageName.split("/"), "package.json");
  if (!existsSync(installedManifest)) {
    failures.push(`Missing installed package: ${packageName}`);
    continue;
  }
  const installedVersion = JSON.parse(readFileSync(installedManifest, "utf8")).version;
  if (installedVersion !== expectedVersion) {
    failures.push(`Package version mismatch: ${packageName} expected ${expectedVersion}, found ${installedVersion}`);
  }
}

const hosting = JSON.parse(readFileSync(path.join(projectRoot, ".openai", "hosting.json"), "utf8"));
if (typeof hosting.d1 !== "string" || hosting.d1.length === 0) failures.push("D1 binding is missing from .openai/hosting.json");
if (typeof hosting.r2 !== "string" || hosting.r2.length === 0) failures.push("R2 binding is missing from .openai/hosting.json");

const migrationDirectory = path.join(projectRoot, "drizzle");
const migrations = existsSync(migrationDirectory) ? readdirSync(migrationDirectory).filter((name) => name.endsWith(".sql")) : [];
if (migrations.length === 0) failures.push("No Drizzle SQL migration was found.");

if (!existsSync(path.join(projectRoot, ".wrangler"))) {
  warnings.push("Local D1/R2 development state is absent; remote Cloudflare data is not restored.");
}

const result = {
  checkedAt: new Date().toISOString(),
  platform: process.platform,
  architecture: process.arch,
  node: process.version,
  bindings: { d1: hosting.d1 ?? null, r2: hosting.r2 ?? null },
  migrationCount: migrations.length,
  packageCount: Object.keys(expectedPackages).length,
  failures,
  warnings,
  ok: failures.length === 0,
};
const reportDirectory = path.join(projectRoot, ".restore");
if (existsSync(reportDirectory)) {
  writeFileSync(path.join(reportDirectory, "verification.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
console.info("[restore-verification]", result);
if (!result.ok) process.exit(1);