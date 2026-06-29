// ============================================================
// Base UI components — the ONLY building blocks for all pages.
// Business components must compose these, never duplicate them.
// ============================================================

import type { ReactNode } from "react";

// ----------------------------------------------------------
// Card
// ----------------------------------------------------------

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-850 rounded-lg border border-gray-700/50 p-5 ${className}`}>
      {children}
    </div>
  );
}

// ----------------------------------------------------------
// SectionHeader
// ----------------------------------------------------------

export function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
      {title}
    </h2>
  );
}

// ----------------------------------------------------------
// LoadingState
// ----------------------------------------------------------

export function LoadingState({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-gray-800 rounded animate-pulse"
          style={{ width: `${100 - i * 20}%` }}
        />
      ))}
    </div>
  );
}

// ----------------------------------------------------------
// EmptyState
// ----------------------------------------------------------

export function EmptyState({ message }: { message: string }) {
  return <p className="text-xs text-gray-600 py-2">{message}</p>;
}

// ----------------------------------------------------------
// ErrorState
// ----------------------------------------------------------

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-yellow-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs text-blue-400 hover:underline">
          Retry
        </button>
      )}
    </div>
  );
}

// ----------------------------------------------------------
// Badge
// ----------------------------------------------------------

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "info";
}) {
  const colors: Record<string, string> = {
    default: "bg-gray-800 text-gray-400 border-gray-700",
    success: "bg-green-900/40 text-green-400 border-green-800",
    warning: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
    info: "bg-blue-900/40 text-blue-400 border-blue-800",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${colors[variant]}`}>
      {children}
    </span>
  );
}

// ----------------------------------------------------------
// Divider
// ----------------------------------------------------------

export function Divider() {
  return <hr className="border-gray-700/30" />;
}
