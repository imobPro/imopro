import ReactMarkdown from "react-markdown";

type Props = { content: string };

export function MarkdownDoc({ content }: Props) {
  return (
    <article className="markdown-doc">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="font-display text-3xl md:text-4xl text-foreground mt-0 mb-4 leading-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-heading text-xl text-foreground mt-8 mb-3 leading-snug">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-heading text-base text-foreground mt-6 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-sm leading-relaxed text-foreground mb-3">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-4 space-y-1.5 text-sm text-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-sm text-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-medium text-foreground">{children}</strong>
          ),
          hr: () => <hr className="my-6 border-border" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/40 pl-4 my-4 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
