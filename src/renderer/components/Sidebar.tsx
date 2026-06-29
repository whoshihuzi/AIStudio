import { useSessionStore } from "@/stores/session";
import { useTranslation } from "@/i18n/useTranslation";
import { WorkspaceExplorer } from "./WorkspaceExplorer";
import { useEffect } from "react";

interface SidebarProps {
  activeView: "dashboard" | "chat";
  onNavigate: (view: "dashboard" | "chat") => void;
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  const sessions = useSessionStore((s) => s.sessions);
  const activeId = useSessionStore((s) => s.activeSessionId);
  const loading = useSessionStore((s) => s.loading);
  const init = useSessionStore((s) => s.init);
  const createSession = useSessionStore((s) => s.createSession);
  const switchSession = useSessionStore((s) => s.switchSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);

  useEffect(() => {
    init();
  }, []);

  function handleSessionClick(id: string) {
    switchSession(id);
    onNavigate("chat");
  }

  return (
    <div className="w-56 bg-gray-850 border-r border-gray-700 flex flex-col h-full">
      {/* Dashboard nav */}
      <div className="px-3 py-3 border-b border-gray-700">
        <button
          onClick={() => onNavigate("dashboard")}
          className={`w-full text-left px-2 py-1.5 rounded text-sm ${
            activeView === "dashboard"
              ? "bg-gray-700 text-gray-100"
              : "text-gray-400 hover:bg-gray-750 hover:text-gray-200"
          }`}
        >
          {t.sidebar.dashboard}
        </button>
      </div>

      {/* Workspace Explorer */}
      <WorkspaceExplorer />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-700">
        <span className="text-sm font-medium text-gray-300">{t.sidebar.sessions}</span>
        <button
          onClick={createSession}
          className="text-gray-400 hover:text-gray-200 text-lg leading-none px-1"
          title={t.sidebar.newChat}
        >
          {t.sidebar.newChat}
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-3 py-2 text-xs text-gray-600">{t.sidebar.loading}</div>
        ) : sessions.length === 0 ? (
          <div className="px-3 py-2 text-xs text-gray-600">
            {t.sidebar.noSessions}
            <br />
            {t.sidebar.noSessionsHint}
          </div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => handleSessionClick(s.id)}
              className={`group flex items-center justify-between px-3 py-2 cursor-pointer text-sm
                ${s.id === activeId && activeView === "chat"
                  ? "bg-gray-700 text-gray-100"
                  : "text-gray-400 hover:bg-gray-750 hover:text-gray-200"
                }`}
            >
              <span className="truncate flex-1">{s.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(s.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 ml-2"
                title={t.sidebar.deleteTitle}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-700 text-xs text-gray-600">
        {t.sidebar.sessionsCount
          .replace("{count}", String(sessions.length))
          .replace("{plural}", sessions.length !== 1 ? "s" : "")}
      </div>
    </div>
  );
}
