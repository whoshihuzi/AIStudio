import { execSync } from "child_process";

// Simulate what DashboardService does — read git working tree
const raw = execSync("git status --short", { encoding: "utf-8", cwd: process.cwd() });
const lines = raw.trim().split("\n").filter(Boolean);

console.log("=== GIT STATUS ===");
console.log(`Total changed: ${lines.length}`);
console.log(`Modified: ${lines.filter(l => l.match(/^\s*M/)).length}`);
console.log(`Untracked: ${lines.filter(l => l.startsWith("??")).length}`);
console.log("");

// Now compute development state
import { DevelopmentIntelligenceService } from "./src/main/development/DevelopmentIntelligenceService.js";
import { inspectDevelopmentState } from "./src/main/development/DevelopmentStateInspector.js";

const svc = new DevelopmentIntelligenceService(process.cwd());

// Build minimal provider data
const workingTree = {
  isClean: lines.length === 0,
  modified: lines.filter(l => l.match(/^\s*M/)).length,
  untracked: lines.filter(l => l.startsWith("??")).length,
  files: lines.map(l => l.trim()),
};

const state = svc.computeState({
  workingTree,
  milestone: null,
  brain: null,
});

console.log(inspectDevelopmentState(state));
