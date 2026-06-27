import { useChatStore } from "@/stores/chat";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { StatusBar } from "./StatusBar";

export function ChatView() {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const sendMessage = useChatStore((s) => s.sendMessage);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <StatusBar />
      <MessageList messages={messages} />
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
