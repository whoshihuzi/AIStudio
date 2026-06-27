import { useEffect, useRef } from "react";
import type { Message } from "@/runtime/types";
import { TextRenderer } from "./TextRenderer";
import { CodeRenderer } from "./CodeRenderer";
import { ToolRenderer } from "./ToolRenderer";
import { ThinkingRenderer } from "./ThinkingRenderer";
import { ImageRenderer } from "./ImageRenderer";
import { FileRenderer } from "./FileRenderer";

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        Send a message to begin.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-800 text-gray-200"
        }`}
      >
        <div className="text-xs opacity-60 mb-1 font-medium">
          {isUser ? "You" : "AI Studio"}
        </div>
        {message.parts.map((part, i) => (
          <PartRenderer key={i} part={part} />
        ))}
      </div>
    </div>
  );
}

function PartRenderer({ part }: { part: Message["parts"][number] }) {
  switch (part.type) {
    case "text":
      return <TextRenderer content={part.content} />;
    case "code":
      return <CodeRenderer language={part.language} content={part.content} />;
    case "tool":
      return <ToolRenderer part={part} />;
    case "thinking":
      return <ThinkingRenderer part={part} />;
    case "image":
      return <ImageRenderer part={part} />;
    case "file":
      return <FileRenderer part={part} />;
  }
}
