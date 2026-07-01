// ============================================================
// Editor Resource Model — shared between Main and Renderer.
// No Electron imports. No Node.js imports. Pure data types.
// ============================================================

// ----------------------------------------------------------
// DocumentMetadata — canonical document model.
// Owned by DocumentStore. Referenced by all Views by path.
// ----------------------------------------------------------

export interface DocumentMetadata {
  /** Stable identifier (workspace-relative path). */
  path: string;
  /** Display name (filename only). */
  name: string;
  /** File content (loaded on demand by PreviewStore). */
  content?: string;
  /** Size in bytes. */
  size?: number;
  /** Last modified timestamp (ms since epoch). */
  modifiedAt?: number;
  /** Inferred language from extension. */
  language?: string;
}
