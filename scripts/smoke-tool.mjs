import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import stripAnsi from "strip-ansi";

function isChrome(line) {
  return (
    line.startsWith("Query:") || line.startsWith("Initializing") ||
    line.startsWith("↻ Resumed") || /^─{2,}/.test(line) ||
    line.startsWith("Resume this") || line.startsWith("Session:") ||
    line.startsWith("Duration:") || line.startsWith("Messages:") ||
    /^hermes --resume/.test(line)
  );
}

const proc = spawn("hermes", ["chat", "--cli", "-q", "list files in E:/AIStudio/src/main"]);
const stdout = createInterface({ input: proc.stdout });
let events = [];

stdout.on("line", (raw) => {
  const clean = stripAnsi(raw).trimEnd();
  const trimmed = clean.trim();

  if (!trimmed) {
    events.push({ raw_preview: "(empty)", category: "skip", event: null });
    return;
  }

  const sm = trimmed.match(/hermes --resume (\S+)/);
  if (sm) {
    events.push({ raw_preview: trimmed.substring(0, 50), category: "session_id", event: null });
    return;
  }

  if (isChrome(trimmed)) {
    events.push({ raw_preview: trimmed.substring(0, 50), category: "chrome", event: null });
    return;
  }

  if (trimmed.startsWith("╭─") || trimmed.startsWith("╰─")) {
    events.push({ raw_preview: trimmed.substring(0, 50), category: "border", event: null });
    return;
  }

  const pm = trimmed.match(/preparing\s+(\S+)…/);
  if (pm) {
    events.push({ raw_preview: trimmed.substring(0, 50), category: "tool_call", event: { type: "tool_call", toolName: pm[1] } });
    return;
  }

  if (trimmed.includes("┊")) {
    events.push({ raw_preview: trimmed.substring(0, 50), category: "tool_result", event: { type: "tool_result", output: trimmed } });
    return;
  }

  events.push({ raw_preview: trimmed.substring(0, 60), category: "text", event: { type: "text", content: trimmed } });
});

proc.on("close", () => {
  const summary = {};
  for (const e of events) summary[e.category] = (summary[e.category] || 0) + 1;

  console.log("\n=== Category Summary ===");
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${v}`);
  console.log(`\n=== Full Trace ===`);
  for (const e of events) {
    const tag = e.category.padEnd(12);
    const preview = (e.raw_preview || "").substring(0, 55);
    const ev = e.event ? ` → ${JSON.stringify(e.event)}` : "";
    console.log(`[${tag}] ${preview}${ev}`);
  }

  const texts = events.filter(e => e.category === "text").map(e => e.raw_preview);
  console.log(`\n=== Text Events (${texts.length}) ===`);
  texts.forEach((t, i) => console.log(`  [${i}] ${t}`));
});
