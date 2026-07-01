// ============================================================
// Development Intelligence — Infrastructure input types
//
// ProviderData is the contract between DashboardService (caller)
// and DevelopmentIntelligenceService (composer). It contains
// ONLY the three provider outputs. Never expands to include
// new providers — if new intelligence needs new data, the
// caller enriches the data before passing it in.
//
// Lives in Infrastructure (src/main/) because it references
// Infrastructure provider types (WorkingTree, MilestoneProgress,
// BrainData). NOT in src/shared/.
// ============================================================

import type { WorkingTree, MilestoneProgress, BrainData } from "../dashboard/types.js";

export interface ProviderData {
  /** Git working tree status from GitProvider */
  workingTree: WorkingTree | null;
  /** Milestone progress from TodoProvider */
  milestone: MilestoneProgress | null;
  /** Project Brain data from BrainProvider */
  brain: BrainData | null;
}
