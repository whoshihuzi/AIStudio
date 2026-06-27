import { ChatView } from "@/components/ChatView";
import { Sidebar } from "@/components/Sidebar";

export function App() {
  return (
    <div className="h-screen flex bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <ChatView />
      </div>
    </div>
  );
}
