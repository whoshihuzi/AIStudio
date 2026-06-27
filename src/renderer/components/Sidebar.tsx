import { useSessionStore } from "@/stores/session";
import { useChatStore } from "@/stores/chat";
import { useEffect } from "react";

export function Sidebar() {
  const sessions = useSessionStore((s) => s.sessions);
  const activeId = useSessionStore((s) => s.activeSessionId);
  const loading = useSessionStore((s) => s.loading);
  const init = useSessionStore((s) => s.init);
  const createSession = useSessionStore((s) => s.createSession);
  const switchSession = useSessionStore((s) => s.switchSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const saveCurrent = useSessionStore((s) => s.saveCurrentSession);
  const chatMessages = useChatStore((s) => s.messages);
  const chatSessionId = useChatStore((s) => s.sessionId);

  useEffect(() => {
    init();
  }, []);

  // Auto-save on message change
  useEffect(() => {
    if (chatSessionId !== "default" && chatMessages.length > 0) {
      saveCurrent(chatMessages);
    }
  }, [chatMessages]);

  return (
    <div className="w-56 bg-gray-850 border-r border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-700">
        <span className="text-sm font-medium text-gray-300">Sessions</span>
        <button
          onClick={createSession}
          className="text-gray-400 hover:text-gray-200 text-lg leading-none px-1"
          title="New Chat"
        >
          +
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-3 py-2 text-xs text-gray-600">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="px-3 py-2 text-xs text-gray-600">
            No sessions yet.
            <br />
            Click + to create one.
          </div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => switchSession(s.id)}
              className={`group flex items-center justify-between px-3 py-2 cursor-pointer text-sm
                ${s.id === activeId
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
                title="Delete"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-700 text-xs text-gray-600">
        {sessions.length} session{sessions.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
