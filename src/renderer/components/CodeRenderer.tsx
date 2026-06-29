import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Props {
  language: string;
  content: string;
}

export function CodeRenderer({ language, content }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const lang = language || "text";

  return (
    <div className="relative group my-2 rounded-lg overflow-hidden border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 text-xs text-gray-400">
        <span>{lang}</span>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity
                     hover:text-gray-200"
        >
          {copied ? "✓ Copied" : "📋 Copy"}
        </button>
      </div>

      {/* Code */}
      <SyntaxHighlighter
        language={lang}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: "0.75rem 1rem",
          background: "#1e1e1e",
          fontSize: "0.8125rem",
          lineHeight: "1.5",
        }}
        codeTagProps={{ style: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" } }}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
}
