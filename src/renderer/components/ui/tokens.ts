// ============================================================
// Design tokens — single source of truth for all visual values.
// No component may use raw Tailwind classes for these.
// ============================================================

export const tokens = {
  // ── Spacing ──
  spacing: {
    xs: "1",
    sm: "2",
    md: "3",
    lg: "4",
    xl: "6",
  },

  // ── Radius ──
  radius: {
    sm: "rounded",
    md: "rounded-lg",
    full: "rounded-full",
  },

  // ── Border ──
  border: {
    default: "border-gray-700/50",
    subtle: "border-gray-700/30",
    strong: "border-gray-700",
  },

  // ── Typography ──
  text: {
    heading: "text-xs font-semibold text-gray-500 uppercase tracking-wider",
    body: "text-sm text-gray-300",
    muted: "text-xs text-gray-600",
    mono: "font-mono text-xs",
    label: "text-xs text-gray-400",
  },

  // ── Color ──
  color: {
    bg: {
      primary: "bg-gray-900",
      card: "bg-gray-850",
      muted: "bg-gray-850/50",
      hover: "bg-gray-750",
      active: "bg-gray-700",
    },
    text: {
      primary: "text-gray-100",
      body: "text-gray-300",
      muted: "text-gray-500",
      dim: "text-gray-600",
    },
    accent: {
      blue: "text-blue-400",
      green: "text-green-400",
      yellow: "text-yellow-400",
      red: "text-red-400",
    },
    status: {
      success: "text-green-400 bg-green-900/40 border-green-800",
      warning: "text-yellow-400",
      error: "text-yellow-400", // same as warning for now
      info: "text-blue-400",
    },
  },

  // ── Layout ──
  layout: {
    sidebarWidth: "w-56",
    headerHeight: "h-10",
    cardPadding: "p-5",
    contentMaxWidth: "max-w-3xl",
    indentIncrement: 16,
  },
} as const;
