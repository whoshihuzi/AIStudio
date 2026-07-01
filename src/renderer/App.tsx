import { useState, useCallback, useEffect } from "react";
import { ChatView } from "@/components/ChatView";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { PreviewPanel } from "@/components/PreviewPanel";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { CommandPalette } from "@/components/CommandPalette";
import { useWorkspacePreviewStore } from "@/stores/workspace-preview";
import { useEditorStore } from "@/stores/editor";
import { useCommandPaletteStore } from "@/stores/command-palette";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";

export function App() {
  const [view, setView] = useState<"dashboard" | "chat">("dashboard");
  const previewVisible = useWorkspacePreviewStore((s) => s.previewVisible);
  const editorVisible = useEditorStore((s) => s.editorVisible);
  const paletteOpen = useCommandPaletteStore((s) => s.open);

  // Preview and Editor are independent siblings. Never mutually exclusive.
  // Each panel's visibility comes from its own Store.
  // Neither panel may inspect the other's state.
  const hasPanels = previewVisible || editorVisible;

  // ── Global keyboard shortcuts (command-driven) ──
  // Ctrl+P and Ctrl+K open the Command Palette.
  // All other registered shortcuts (F5, Ctrl+Shift+B, Ctrl+N, etc.)
  // dispatch via the Command system automatically.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ctrl+P / Cmd+P / Ctrl+K — open Command Palette
      // These are reserved for palette open regardless of focus.
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "k")) {
        e.preventDefault();
        paletteOpen();
      }
    },
    [paletteOpen],
  );

  // Command-driven global shortcuts: all registry shortcuts
  // (F5, Ctrl+Shift+B, Ctrl+N, etc.) dispatch automatically.
  // Suppress when an input/textarea/select is focused.
  useGlobalShortcuts({
    ignoreWhen: () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (el as HTMLElement).isContentEditable
      );
    },
  });

  // Register Ctrl+P / Ctrl+K palette-open handler.
  // Registered separately because Ctrl+P is owned by the palette,
  // not by the workspace.openFile command (whose shortcut is removed).
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-screen flex bg-gray-900">
      <Sidebar activeView={view} onNavigate={(v) => setView(v)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {view === "dashboard" ? <Dashboard /> : <ChatView />}
      </div>
      {hasPanels && (
        <div className="w-96 shrink-0 flex flex-row">
          {previewVisible && (
            <div className="flex-1 min-w-0 flex flex-col">
              <PreviewPanel />
            </div>
          )}
          {editorVisible && (
            <div className="flex-1 min-w-0 flex flex-col">
              <EditorPanel />
            </div>
          )}
        </div>
      )}
      <CommandPalette />
    </div>
  );
}
