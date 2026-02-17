// ABOUTME: Main application shell for Marginalia.
// ABOUTME: Manages top-level state and layout — input view, document+sidebar, toolbar.

import { useState, useCallback } from 'react';
import { useAnnotations } from './hooks/useAnnotations';
import { useTheme } from './hooks/useTheme';
import { useFileDrop } from './hooks/useFileDrop';
import { InputView } from './components/InputView';
import { DocumentView } from './components/DocumentView';
import { RawView } from './components/RawView';
import { Sidebar } from './components/Sidebar';
import { ExportControls } from './components/ExportControls';
import { ThemeToggle } from './components/ThemeToggle';
import type { ViewMode } from './lib/types';

export default function App() {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('rendered');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const {
    annotations,
    activeAnnotationId,
    setActiveAnnotationId,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    clearAnnotations,
    shiftAnnotations,
  } = useAnnotations();

  const handleLoadMarkdown = useCallback((content: string) => {
    setMarkdown(content);
  }, []);

  const handleEditMarkdown = useCallback(
    (startOffset: number, endOffset: number, newText: string) => {
      if (markdown === null) return;
      const updated =
        markdown.slice(0, startOffset) + newText + markdown.slice(endOffset);
      setMarkdown(updated);
      shiftAnnotations(startOffset, endOffset, newText.length);
    },
    [markdown, shiftAnnotations],
  );

  const handleReset = useCallback(() => {
    setMarkdown(null);
    setActiveAnnotationId(null);
  }, [setActiveAnnotationId]);

  const handleFileDropLoad = useCallback(
    (content: string) => {
      setMarkdown(content);
      clearAnnotations();
    },
    [clearAnnotations],
  );

  const { isDragging, dragHandlers } = useFileDrop({
    onFileLoad: handleFileDropLoad,
  });

  const handleAnnotationActivate = useCallback(
    (id: string) => {
      setActiveAnnotationId(id);
      // Scroll to the highlight in the document
      const mark = document.querySelector(`mark[data-annotation-id="${id}"]`);
      if (mark) {
        mark.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },
    [setActiveAnnotationId],
  );

  // Show input view when no markdown is loaded
  if (markdown === null) {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-ink-900">
        <div className="fixed top-4 right-4">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <InputView onSubmit={handleLoadMarkdown} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-ink-900 flex flex-col" {...dragHandlers}>
      {/* Drop overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cream-50/80 dark:bg-ink-900/80 backdrop-blur-sm">
          <div className="border-2 border-dashed border-sienna-400 rounded-2xl px-16 py-12 text-center">
            <svg className="mx-auto mb-4 text-sienna-500 dark:text-sienna-400" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="12" y2="12" />
              <line x1="15" y1="15" x2="12" y2="12" />
            </svg>
            <p className="font-serif text-lg text-ink-600 dark:text-cream-200">
              Drop to replace document
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <header className="shrink-0 border-b border-cream-300 dark:border-ink-700 bg-cream-50/80 dark:bg-ink-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left: Title + view toggle */}
          <div className="flex items-center gap-6">
            <button
              onClick={handleReset}
              className="font-serif text-lg font-light text-ink-800 dark:text-cream-100 hover:text-sienna-500 dark:hover:text-sienna-400 transition-colors"
            >
              Marginalia
            </button>

            <div className="flex items-center bg-cream-200 dark:bg-ink-700 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('rendered')}
                className={`px-3 py-1 text-xs font-sans font-medium rounded-md transition-colors ${
                  viewMode === 'rendered'
                    ? 'bg-cream-50 dark:bg-ink-600 text-ink-700 dark:text-cream-100 shadow-sm'
                    : 'text-ink-400 dark:text-ink-300 hover:text-ink-600 dark:hover:text-ink-100'
                }`}
              >
                Rendered
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`px-3 py-1 text-xs font-sans font-medium rounded-md transition-colors ${
                  viewMode === 'raw'
                    ? 'bg-cream-50 dark:bg-ink-600 text-ink-700 dark:text-cream-100 shadow-sm'
                    : 'text-ink-400 dark:text-ink-300 hover:text-ink-600 dark:hover:text-ink-100'
                }`}
              >
                Raw
              </button>
            </div>
          </div>

          {/* Right: Export + theme */}
          <div className="flex items-center gap-3">
            <ExportControls markdown={markdown} annotations={annotations} />
            <div className="w-px h-5 bg-cream-300 dark:bg-ink-700" />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Document */}
        <main className="flex-1 overflow-y-auto px-12 py-8 lg:px-20 xl:px-28">
          <div className="max-w-3xl mx-auto">
            {viewMode === 'rendered' ? (
              <DocumentView
                markdown={markdown}
                annotations={annotations}
                activeAnnotationId={activeAnnotationId}
                onAddAnnotation={addAnnotation}
                onActivateAnnotation={handleAnnotationActivate}
                onEditMarkdown={handleEditMarkdown}
              />
            ) : (
              <RawView markdown={markdown} />
            )}
          </div>
        </main>

        {/* Sidebar */}
        <Sidebar
          annotations={annotations}
          activeAnnotationId={activeAnnotationId}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          onActivate={handleAnnotationActivate}
          onUpdate={updateAnnotation}
          onDelete={deleteAnnotation}
        />
      </div>
    </div>
  );
}
