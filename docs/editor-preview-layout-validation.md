# Editor / Preview Panel Layout — Validation

M12b.5 — Panel Layout Refactor

**Date:** 2026-06-30
**Status:** to-be-verified

---

## Architecture

Preview and Editor are independent siblings. Never mutually exclusive.

```
[Sidebar] [MainContent] [PreviewPanel?] [EditorPanel?]
             flex-1         flex-1          flex-1
```

- Sidebar: `w-56` fixed
- MainContent: `flex-1` (Dashboard or ChatView)
- Panels container: `w-96 shrink-0 flex flex-row` (only rendered when at least one panel visible)
- PreviewPanel wrapper: `flex-1 min-w-0 flex flex-col` (50% of w-96 = 192px when both visible)
- EditorPanel wrapper: `flex-1 min-w-0 flex flex-col` (50% of w-96 = 192px when both visible)

## Visibility Rules

| Panel        | Store                         | Field      |
|-------------|-------------------------------|------------|
| PreviewPanel | `useWorkspacePreviewStore`    | `visible`  |
| EditorPanel  | `useEditorStore`              | `isVisible`|

Neither panel inspects the other's state.

---

## Scenario Matrix

### 1. Preview only

- `previewVisible = true`, `editorVisible = false`
- Layout: `[Sidebar] [MainContent] [PreviewPanel (384px)]`
- PreviewPanel renders full `w-96`
- EditorPanel wrapper not in DOM
- Verified: [ ]

### 2. Editor only

- `previewVisible = false`, `editorVisible = true`
- Layout: `[Sidebar] [MainContent] [EditorPanel (384px)]`
- EditorPanel renders full `w-96`
- PreviewPanel wrapper not in DOM
- Verified: [ ]

### 3. Both visible

- `previewVisible = true`, `editorVisible = true`
- Layout: `[Sidebar] [MainContent] [Preview (192px)] [Editor (192px)]`
- Both panels mounted, each `flex-1` inside `flex-row`
- 50/50 horizontal split within `w-96` container
- Verified: [ ]

### 4. Dashboard + Preview

- View: dashboard, `previewVisible = true`, `editorVisible = false`
- Layout: `[Sidebar] [Dashboard] [PreviewPanel]`
- Dashboard renders in MainContent, Preview at right
- Verified: [ ]

### 5. Dashboard + Editor

- View: dashboard, `previewVisible = false`, `editorVisible = true`
- Layout: `[Sidebar] [Dashboard] [EditorPanel]`
- Verified: [ ]

### 6. Chat + Preview

- View: chat, `previewVisible = true`, `editorVisible = false`
- Layout: `[Sidebar] [ChatView] [PreviewPanel]`
- Verified: [ ]

### 7. Chat + Editor

- View: chat, `previewVisible = false`, `editorVisible = true`
- Layout: `[Sidebar] [ChatView] [EditorPanel]`
- Verified: [ ]

### 8. Chat + Preview + Editor

- View: chat, `previewVisible = true`, `editorVisible = true`
- Layout: `[Sidebar] [ChatView] [Preview (192px)] [Editor (192px)]`
- All three content areas visible simultaneously
- Verified: [ ]

---

## Anti-Regressions

- [ ] Opening Preview does not close Editor
- [ ] Opening Editor does not close Preview
- [ ] Closing Editor does not affect Preview
- [ ] Closing Preview does not affect Editor
- [ ] No tabs, no tab bar rendered
- [ ] No drag handles, no resize cursors
- [ ] No docking UI elements

---

## Files Changed

- `src/renderer/App.tsx` — layout refactor only
