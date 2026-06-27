import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import stripAnsi from "strip-ansi";

// Quick smoke test of parseLine logic
function isChrome(line) {
  return (
    line.startsWith("Query:") ||
    line.startsWith("Initializing") ||
    line.startsWith("↻ Resumed") ||
    /^─{2,}/.test(line) ||
    line.startsWith("Resume this") ||
    line.startsWith("Session:") ||
    line.startsWith("Duration:") ||
    line.startsWith("Messages:") ||
    /^hermes --resume/.test(line)
  );
}

const proc = spawn("hermes", ["chat", "--cli", "-q", "say hello in exactly one Chinese sentence"]);
const stdout = createInterface({ input: proc.stdout });

let events = [];

stdout.on("line", (raw) => {
  const clean = stripAnsi(raw).trimEnd();
  const trimmed = clean.trim();
  if (!trimmed) { events.push({ type: "empty" }); return; }

  const sm = trimmed.match(/hermes --resume (\S+)/);
  if (sm) { events.push({ type: "session_id", id: sm[1] }); return; }

  if (isChrome(trimmed)) { events.push({ type: "chrome", text: trimmed.substring(0,60) }); return; }
  if (trimmed.startsWith("╭─") || trimmed.startsWith("╰─")) { events.push({ type: "border" }); return; }

  const pm = trimmed.match(/preparing\s+(\S+)…/);
  if (pm) { events.push({ type: "tool_call", tool: pm[1] }); return; }
  if (trimmed.includes("┊")) { events.push({ type: "tool_result", text: trimmed.substring(0,60) }); return; }

  events.push({ type: "content", text: trimmed });
});

proc.on("close", () => {
  console.log("\n=== Parsed Events ===");
  for (const e of events) console.log(JSON.stringify(e));
  const content = events.filter(e => e.type === "content").map(e => e.text).join("\n");
  console.log("\n=== Final Content ===");
  console.log(content || "(empty)");
  console.log(`\nTotal events: ${events.length}, Content events: ${events.filter(e => e.type === "content").length}`);
});
