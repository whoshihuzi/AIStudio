import { useChatStore } from "@/stores/chat";

export function StatusBar() {
  const isLoading = useChatStore((s) => s.isLoading);
  const cancelRequest = useChatStore((s) => s.cancelRequest);

  return (
    <div className="flex items-center justify-between px-4 py-1.5 border-b border-gray-700 bg-gray-850">
      <span className="text-xs text-gray-500 font-medium">Chat</span>
      <div className="flex items-center gap-3">
        {isLoading ? (
          <>
            <span className="text-xs text-yellow-400 animate-pulse">Running...</span>
            <button
              onClick={cancelRequest}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-0.5
                         border border-gray-600 rounded hover:border-gray-400 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <span className="text-xs text-gray-600">Idle</span>
        )}
      </div>
    </div>
  );
}
