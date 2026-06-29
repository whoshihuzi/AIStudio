import { useState, useRef, useEffect, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, [value]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter without Shift → send
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed && !disabled) {
        onSend(trimmed);
        setValue("");
      }
    }
  }

  return (
    <div className="border-t border-gray-700 p-3">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI Studio..."
          disabled={disabled}
          rows={1}
          className="flex-1 bg-gray-800 text-gray-200 rounded-lg px-3 py-2
                     resize-none outline-none border border-gray-600
                     focus:border-blue-500 disabled:opacity-50
                     text-sm font-sans placeholder-gray-500"
        />
        <button
          onClick={() => {
            const trimmed = value.trim();
            if (trimmed && !disabled) {
              onSend(trimmed);
              setValue("");
            }
          }}
          disabled={disabled || !value.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg
                     hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed
                     text-sm font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
