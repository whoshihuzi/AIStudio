# AI Studio — Regression Test Checklist

> Run this checklist after every bug fix or feature change.
> Mark each item ✓ (pass) or ✗ (fail). If any item fails, the fix introduced a regression.

---

## R1: Typecheck + Build

| # | Test | Expected |
|---|------|----------|
| R1.1 | `npm run typecheck` | Zero errors |
| R1.2 | `npm run build` | Build succeeds, no warnings |
| R1.3 | `npm start` (production build) | Electron window launches |

---

## R2: Session CRUD

| # | Test | Expected |
|---|------|----------|
| R2.1 | Create new session | Sidebar shows new session, chat clears |
| R2.2 | Switch between sessions | Messages load correctly for each session |
| R2.3 | Delete a session (not current) | Session removed from sidebar, current chat unchanged |
| R2.4 | Delete current session (has other sessions) | Chat switches to next session, messages update |
| R2.5 | Delete last remaining session | Chat messages cleared, sidebar shows "No sessions yet" |
| R2.6 | Session persists across app restart | Close and reopen → sessions still in sidebar |

---

## R3: Chat Messaging

| # | Test | Expected |
|---|------|----------|
| R3.1 | Send message | User message appears, assistant response streams |
| R3.2 | Send message with tool call (e.g. "list files") | Tool card appears, result shown, text follows |
| R3.3 | Markdown rendering | Bold, italic, code blocks, lists render correctly |
| R3.4 | Code block with language | Syntax highlighting + copy button work |
| R3.5 | Empty message submit | Should not send (no effect) |

---

## R4: Cancel

| # | Test | Expected |
|---|------|----------|
| R4.1 | Cancel during streaming | Process terminates, UI shows Idle |
| R4.2 | Cancel when idle | No-op (no crash) |
| R4.3 | Send message after cancel | New message works normally |

---

## R5: P1 Gotchas Section

> This section validates *all* subtle side-effects of the P1 fix.

| # | Gotcha | Expected |
|---|--------|----------|
| P1-G1 | Click Cancel during streaming, then immediately send 2 more messages in rapid succession | Only the last one should render (no dead runtime) |
| P1-G2 | Click Cancel on a message with tool call (e.g. >2s response), then send another message that ALSO uses tools | Both: first cancels cleanly; second: tool cards appear independently (no stale tool/tool_result from first) |
| P1-G3 | Close window while agent is running (Alt+F4 or window X button) | App exits cleanly, no zombie processes left |
| P1-G4 | `npm run build` after fix | Build succeeds with zero errors |
| P1-G5 | `npm run typecheck` after fix | Zero errors |
| P1-G6 | Regression: Create session → send message → see streaming → cancel → create new session → send another message | Second message works, no stale events cross sessions |

---

## R6: Auto-Save

| # | Test | Expected |
|---|------|----------|
| R6.1 | First session: send message, wait 3s, restart app | Message is persisted |
| R6.2 | Streaming: send long message, wait for response | No UI stutter (debounce working) |
| R6.3 | Switch session: send message in Session A, switch to Session B | Session A's message saved before switch |
| R6.4 | Save includes all message types (text + code + tool) | Reload session → all parts present |

---

## R7: Streaming Scroll

| # | Test | Expected |
|---|------|----------|
| R7.1 | Send message, watch streaming | Scroll follows content without jitter |
| R7.2 | Scroll up during streaming | View stays where user scrolled (no snap-back) |
| R7.3 | Scroll to bottom manually during streaming | Content remains visible |
| R7.4 | Response completes | Final position at bottom of message |

---

## Running the Checklist

```bash
# 1. Build check
cd E:/AIStudio
npm run typecheck
npm run build

# 2. Launch and manually verify R2-R7
npm run dev

# 3. Verify persistence (R2.6, R6.1)
# Close window → npm run dev → check sessions + messages
```
