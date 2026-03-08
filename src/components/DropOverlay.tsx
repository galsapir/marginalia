// ABOUTME: Full-screen overlay shown when a file is being dragged over the app.
// ABOUTME: Displays a dashed border area with an icon and configurable message.

interface DropOverlayProps {
  message: string;
}

export function DropOverlay({ message }: DropOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cream-50/80 dark:bg-ink-900/80 backdrop-blur-sm">
      <div className="border-2 border-dashed border-sienna-400 rounded-2xl px-16 py-12 text-center">
        <svg
          className="mx-auto mb-4 text-sienna-500 dark:text-sienna-400"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="12" y2="12" />
          <line x1="15" y1="15" x2="12" y2="12" />
        </svg>
        <p className="font-serif text-lg text-ink-600 dark:text-cream-200">
          {message}
        </p>
      </div>
    </div>
  );
}
