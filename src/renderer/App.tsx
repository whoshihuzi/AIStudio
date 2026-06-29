import { useState } from "react";
import { ChatView } from "@/components/ChatView";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";

export function App() {
  const [view, setView] = useState<"dashboard" | "chat">("dashboard");

  return (
    <div className="h-screen flex bg-gray-900">
      <Sidebar
        activeView={view}
        onNavigate={(v) => setView(v)}
      />
      <div className="flex-1 flex flex-col">
        {view === "dashboard" ? <Dashboard /> : <ChatView />}
      </div>
    </div>
  );
}
