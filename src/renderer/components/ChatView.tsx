import { useChatStore } from "@/stores/chat";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

export function ChatView() {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const cancelRequest = useChatStore((s) => s.cancelRequest);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header / Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-850">
        <span className="text-sm text-gray-400 font-medium">Chat</span>
        <div className="flex items-center gap-3">
          {isLoading && (
            <span className="text-xs text-yellow-400 animate-pulse">
              Running...
            </span>
          )}
          {isLoading ? (
            <button
              onClick={cancelRequest}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-0.5
                         border border-gray-600 rounded hover:border-gray-400 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <span className="text-xs text-gray-600">Idle</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} />

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
