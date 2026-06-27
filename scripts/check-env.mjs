#!/usr/bin/env node

/**
 * Environment Check for AI Studio
 * Validates that all required tools and directories exist before launch.
 * Run: node scripts/check-env.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

let errors = 0;

function ok(label) {
  console.log(`  ✓ ${label}`);
}

function fail(label, detail) {
  console.log(`  ✗ ${label}`);
  if (detail) console.log(`    ${detail}`);
  errors++;
}

function warn(label, detail) {
  console.log(`  ⚠ ${label}`);
  if (detail) console.log(`    ${detail}`);
}

console.log("\nAI Studio — Environment Check\n");

// ---- Node.js ----
console.log("Runtime:");
try {
  const v = execSync("node --version", { encoding: "utf-8" }).trim();
  ok(`Node.js ${v}`);
} catch {
  fail("Node.js not found", "Install from https://nodejs.org");
}

// ---- npm ----
try {
  const v = execSync("npm --version", { encoding: "utf-8" }).trim();
  ok(`npm ${v}`);
} catch {
  fail("npm not found", "Comes with Node.js");
}

// ---- Hermes CLI ----
try {
  execSync("hermes --version", { encoding: "utf-8", stdio: "pipe" });
  ok("Hermes CLI available");
} catch {
  fail("Hermes CLI not found", "Install hermes-agent or check PATH");
}

// ---- Project files ----
console.log("\nProject:");
const pkgPath = join(ROOT, "package.json");
if (existsSync(pkgPath)) {
  ok("package.json");
} else {
  fail("package.json missing", `Expected at ${pkgPath}`);
}

const installed = existsSync(join(ROOT, "node_modules", "electron"));
if (installed) {
  ok("node_modules/ installed");
} else {
  fail("Dependencies not installed", "Run: npm install");
}

// ---- Directories ----
console.log("\nDirectories:");
const requiredDirs = ["src", "docs", "workspace"];
for (const dir of requiredDirs) {
  const path = join(ROOT, dir);
  if (existsSync(path)) {
    ok(`${dir}/`);
  } else {
    warn(`${dir}/ missing — will be created at runtime`);
  }
}

// ---- Summary ----
console.log("\n" + "─".repeat(40));
if (errors === 0) {
  console.log("All checks passed. Ready to launch.\n");
} else {
  console.log(`${errors} issue(s) found. Fix before launching.\n`);
}
process.exit(errors > 0 ? 1 : 0);
