// ============================================================
// Editor Resource Model — shared between Main and Renderer.
// No Electron imports. No Node.js imports. Pure data types.
// ============================================================

// ----------------------------------------------------------
// EditorFile — a file opened in the editor
// ----------------------------------------------------------

export interface EditorFile {
  /** Path relative to workspace root. */
  path: string;
  /** Display name (filename only). */
  name: string;
  /** Whether the file has unsaved changes. */
  dirty: boolean;
}

// ----------------------------------------------------------
// EditorState — aggregate editor state (shared contract)
// ----------------------------------------------------------

export interface EditorState {
  /** Currently open files (tabs). */
  openFiles: EditorFile[];
  /** The active (focused) file, if any. */
  activeFile: EditorFile | null;
  /** Set of paths with unsaved changes. */
  dirtyFiles: Set<string>;
  /** Whether the editor panel is visible. */
  isVisible: boolean;
}
