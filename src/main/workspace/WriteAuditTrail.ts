// ============================================================
// WriteAuditTrail — in-memory audit trail recording every
// disk mutation that passes through the single write gate.
// ============================================================

import type { WriteAuditEntry, WriteOperation } from "../../shared/editor/audit.js";

export interface IWriteAuditTrail {
  record(path: string, operation: WriteOperation, size: number): void;
  recent(count?: number): WriteAuditEntry[];
  since(timestamp: number): WriteAuditEntry[];
  forPath(path: string): WriteAuditEntry[];
  clear(): void;
}

export class WriteAuditTrail implements IWriteAuditTrail {
  private entries: WriteAuditEntry[] = [];
  private readonly maxEntries: number;

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  record(path: string, operation: WriteOperation, size: number): void {
    const entry: WriteAuditEntry = {
      path,
      operation,
      size,
      timestamp: Date.now(),
    };
    this.entries.push(entry);
    // Circular buffer: keep only the most recent maxEntries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  recent(count: number = 20): WriteAuditEntry[] {
    return this.entries.slice(-count).reverse();
  }

  since(timestamp: number): WriteAuditEntry[] {
    return this.entries
      .filter((e) => e.timestamp >= timestamp)
      .reverse();
  }

  forPath(path: string): WriteAuditEntry[] {
    return this.entries
      .filter((e) => e.path === path)
      .reverse();
  }

  clear(): void {
    this.entries = [];
  }
}
