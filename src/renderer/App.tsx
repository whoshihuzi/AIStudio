import { useState } from "react";
import { ChatView } from "@/components/ChatView";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { PreviewPanel } from "@/components/PreviewPanel";
import { useWorkspacePreviewStore } from "@/stores/workspace-preview";

export function App() {
  const [view, setView] = useState<"dashboard" | "chat">("dashboard");
  const previewVisible = useWorkspacePreviewStore((s) => s.visible);

  return (
    <div className="h-screen flex bg-gray-900">
      <Sidebar activeView={view} onNavigate={(v) => setView(v)} />
      <div className="flex-1 flex flex-col">
        {view === "dashboard" ? <Dashboard /> : <ChatView />}
      </div>
      {previewVisible && <div className="w-96 shrink-0 flex flex-col"><PreviewPanel /></div>}
    </div>
  );
}
