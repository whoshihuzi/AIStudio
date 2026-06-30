import { useState } from "react";
import { ChatView } from "@/components/ChatView";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { PreviewPanel } from "@/components/PreviewPanel";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { useWorkspacePreviewStore } from "@/stores/workspace-preview";
import { useEditorStore } from "@/stores/editor";

export function App() {
  const [view, setView] = useState<"dashboard" | "chat">("dashboard");
  const previewVisible = useWorkspacePreviewStore((s) => s.visible);
  const editorVisible = useEditorStore((s) => s.isVisible);

  // Preview and Editor are independent siblings. Never mutually exclusive.
  // Each panel's visibility comes from its own Store.
  // Neither panel may inspect the other's state.
  const hasPanels = previewVisible || editorVisible;

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
    </div>
  );
}
