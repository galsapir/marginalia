// ABOUTME: Read-only raw markdown display with monospace formatting.
// ABOUTME: Shows the original markdown source text with line numbers.

interface RawViewProps {
  markdown: string;
}

export function RawView({ markdown }: RawViewProps) {
  const lines = markdown.split('\n');

  return (
    <div className="font-mono text-sm leading-relaxed">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="hover:bg-cream-100 dark:hover:bg-ink-800">
              <td className="select-none text-right pr-4 py-0.5 text-ink-200 dark:text-ink-600 text-xs w-8 align-top">
                {i + 1}
              </td>
              <td className="py-0.5 text-ink-600 dark:text-ink-200 whitespace-pre-wrap break-words">
                {line || '\u00A0'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
