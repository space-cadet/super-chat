import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        pre: ({ children }) => (
          <pre className="bg-gray-100 rounded-lg p-3 overflow-x-auto text-sm my-2">
            {children}
          </pre>
        ),
        code: ({ className, children }) => {
          const isInline = !className;
          return isInline ? (
            <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">
              {children}
            </code>
          ) : (
            <code className={className}>{children}</code>
          );
        },
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
