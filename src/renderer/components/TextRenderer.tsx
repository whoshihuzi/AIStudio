import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeRenderer } from "./CodeRenderer";
import type { Components } from "react-markdown";

interface Props {
  content: string;
}

export function TextRenderer({ content }: Props) {
  const components: Partial<Components> = {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const codeString = String(children).replace(/\n$/, "");

      // Inline code
      if (!match) {
        return (
          <code
            className="bg-gray-800 text-gray-200 px-1.5 py-0.5 rounded text-xs font-mono"
            {...props}
          >
            {children}
          </code>
        );
      }

      // Fenced code block — delegate to CodeRenderer
      return <CodeRenderer language={match[1]!} content={codeString} />;
    },
    pre({ children }) {
      // react-markdown wraps fenced code in <pre> — pass through
      return <>{children}</>;
    },
    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          {children}
        </a>
      );
    },
    table({ children }) {
      return (
        <div className="overflow-x-auto my-2">
          <table className="min-w-full border-collapse border border-gray-700 text-sm">
            {children}
          </table>
        </div>
      );
    },
    th({ children }) {
      return (
        <th className="border border-gray-700 px-3 py-1.5 bg-gray-800 text-left font-medium">
          {children}
        </th>
      );
    },
    td({ children }) {
      return <td className="border border-gray-700 px-3 py-1.5">{children}</td>;
    },
    blockquote({ children }) {
      return (
        <blockquote className="border-l-3 border-gray-600 pl-3 my-2 text-gray-400 italic">
          {children}
        </blockquote>
      );
    },
  };

  return (
    <div className="prose prose-invert prose-sm max-w-none leading-relaxed
                    prose-headings:text-gray-100 prose-p:text-gray-200
                    prose-strong:text-gray-100 prose-li:text-gray-200
                    prose-hr:border-gray-700">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
