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
  const editorActive = useEditorStore((s) => s.activeFile !== null);

  // Panel slot: Editor takes priority. At most one panel is shown.
  const panel = editorActive ? (
    <div className="w-96 shrink-0 flex flex-col">
      <EditorPanel />
    </div>
  ) : previewVisible ? (
    <div className="w-96 shrink-0 flex flex-col">
      <PreviewPanel />
    </div>
  ) : null;

  return (
    <div className="h-screen flex bg-gray-900">
      <Sidebar activeView={view} onNavigate={(v) => setView(v)} />
      <div className="flex-1 flex flex-col">
        {view === "dashboard" ? <Dashboard /> : <ChatView />}
      </div>
      {panel}
    </div>
  );
}
