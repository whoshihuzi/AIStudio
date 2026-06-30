# M10.8a — Workspace UX Validation

**Date**: 2026-06-28

---

## Discovered Issues

| # | Issue | Current State | Target State |
|---|---|---|---|
| U1 | Preview belongs to Dashboard | Nested in `{view === "dashboard" && <Dashboard />}` condition | Sibling at App Root, survives view switches |
| U2 | Preview closes on navigation | Switching Dashboard→Chat hides preview panel | Preview stays open across view changes |
| U3 | Session scroll not restored | Always scrolls to bottom on enter | Save/restore scrollTop per session |
| U4 | Chat input draft lost | Switching sessions clears draft text | Save/restore draft per session |
| U5 | No file highlight in tree | All tree nodes same color | Selected file highlighted |
| U6 | No Esc to close preview | Only ✕ button closes | Esc key closes preview |
| U7 | Preview width fixed | w-96, not resizable | Draggable left border |
| U8 | Expand state lost on nav | Switching views collapses all | Expand state persists in store |

---

## Architecture Validation

| Check | Status |
|---|---|
| Preview is independent of Dashboard | ✗ (U1) |
| Preview survives view switches | ✗ (U2) |
| File selection highlights in tree | ✗ (U5) |
| Session state is preserved | ✗ (U3, U4) |
| WorkspaceViewState covers all views | ✓ (future: search, editor, diff) |
| Navigation matrix is consistent | ✓ (defined in 13_WORKSPACE_UX.md) |
| Future features compatible | ✓ (search, editor, diff, command palette) |

---

## Refactoring Plan

```
M10.8b: Move Preview to App Root
  - PreviewPanel renders at App level, not inside Dashboard
  - previewFile state controls visibility (not currentView)
  - Preview stays open when switching Dashboard↔Chat

M10.8c: Explorer Polish
  - selectedWorkspaceNode highlight in tree
  - Esc key closes preview
  - Expand state persists in WorkspaceStore

M10.8d: Session UX
  - sessionScrollPositions save/restore
  - chatInputDraft save/restore per session

M10.8e: Preview Polish
  - Resizable preview width
  - Expand state survives view switches
```

---

## Frozen Architecture

`architecture/13_WORKSPACE_UX.md` defines:
- App Root layout (Sidebar | Main | Preview)
- WorkspaceViewState interface
- Navigation rules matrix (8 actions)
- Preview rules (ownership, behavior, states)
- Chat rules (scroll restore, input draft)
- Explorer rules (selection, expand persistence)

No code changes. Architecture frozen.
