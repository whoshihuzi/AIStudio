// Smoke test: verifies ContextBuilder produces valid markdown.
// Run with: node --experimental-vm-modules scripts/smoke-context.mjs
// Or just check the debug output at workspace/debug/context.md after
// running the app in dev mode.

import { ContextBuilder } from "../src/main/context/ContextBuilder.js";

const builder = new ContextBuilder();
const output = builder.build({
  tokenBudget: 4000,
  userPrompt: "TEST PROMPT — verify context injection works",
});

// Basic validation
const checks: Array<[string, boolean]> = [
  ["non-empty output", output.length > 0],
  ["contains Project Context header", output.includes("# Project Context")],
  ["contains Project section", output.includes("## Project")],
  ["contains Current Focus", output.includes("## Current Focus")],
  ["contains Environment", output.includes("## Environment")],
  ["contains Architecture", output.includes("## Architecture")],
  ["contains Key Principles", output.includes("## Key Principles")],
  ["contains TEST PROMPT", output.includes("TEST PROMPT")],
  ["user prompt after separator", output.includes("---\n\nTEST PROMPT")],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(ok ? `  ✓ ${name}` : `  ✗ ${name}`);
  if (ok) passed++;
}

console.log(`\n${passed}/${checks.length} checks passed`);
console.log(`\n--- CONTEXT OUTPUT (first 500 chars) ---`);
console.log(output.slice(0, 500));
console.log(`\n--- TOTAL LENGTH: ${output.length} chars ---`);

if (passed === checks.length) {
  console.log("\n✓ ALL CHECKS PASSED");
} else {
  console.log("\n✗ SOME CHECKS FAILED");
  process.exit(1);
}
