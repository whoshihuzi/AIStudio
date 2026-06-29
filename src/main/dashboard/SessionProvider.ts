// ============================================================
// SessionProvider — reads session metadata from SessionStore.
// Internal implementation detail of the Main process.
// ============================================================

import * as sessionStore from "../runtime/session-store.js";

export class SessionProvider {
  // ----------------------------------------------------------
  // Recent Sessions
  // ----------------------------------------------------------

  getRecentSessions(count: number): Array<{ id: string; title: string }> {
    try {
      const all = sessionStore.listSessions();
      return all.slice(0, count).map((s) => ({ id: s.id, title: s.title }));
    } catch {
      return [];
    }
  }
}
