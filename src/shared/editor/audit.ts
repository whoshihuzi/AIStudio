// ============================================================
// Write Audit — shared resource model.
// Records every disk mutation through the single write gate.
// ============================================================

export type WriteOperation = "create" | "update" | "delete";

export interface WriteAuditEntry {
  /** Workspace-relative path of the mutated file. */
  path: string;
  /** What kind of mutation occurred. */
  operation: WriteOperation;
  /** File size in bytes after the write. */
  size: number;
  /** Timestamp of the write (ms since epoch). */
  timestamp: number;
  /** SHA-256 hash of the content after write (optional, for integrity). */
  contentHash?: string;
}
