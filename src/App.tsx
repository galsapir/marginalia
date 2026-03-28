// ABOUTME: Main application shell for Marginalia.
// ABOUTME: Manages top-level state and layout — input view, document+sidebar, toolbar.

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAnnotations } from './hooks/useAnnotations';
import { useTheme } from './hooks/useTheme';
import { useFileDrop } from './hooks/useFileDrop';
import { InputView } from './components/InputView';
import { DocumentView } from './components/DocumentView';
import { RawView } from './components/RawView';
import { Sidebar } from './components/Sidebar';
import { ExportControls } from './components/ExportControls';
import { DropOverlay } from './components/DropOverlay';
import { ThemeToggle } from './components/ThemeToggle';
import { fetchGitHubMarkdown } from './lib/github';
import type { ViewMode } from './lib/types';

export default function App() {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('rendered');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  const handleLoadMarkdown = useCallback((content: string, contentBaseUrl?: string, contentSourceUrl?: string) => {
    setMarkdown(content);
    setBaseUrl(contentBaseUrl ?? null);
    setSourceUrl(contentSourceUrl ?? null);
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
    setBaseUrl(null);
    setSourceUrl(null);
    setActiveAnnotationId(null);
    // Clean up query param if present
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
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
      // DocumentView's useEffect handles scrolling the mark into view
    },
    [setActiveAnnotationId],
  );

  // Auto-load from ?url= query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    if (!urlParam) return;
    fetchGitHubMarkdown(urlParam).then(
      ({ markdown: md, baseUrl: bu }) => handleLoadMarkdown(md, bu, urlParam),
      () => {
        // Failed to load — clear query param and let user try manually
        window.history.replaceState({}, '', window.location.pathname);
      },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleShare = useCallback(() => {
    if (!sourceUrl) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?url=${encodeURIComponent(sourceUrl)}`;
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1500);
  }, [sourceUrl]);

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
      {isDragging && <DropOverlay message="Drop to replace document (.md, .txt, .pdf)" />}

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

          {/* Right: Focus + Export + theme */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFocusMode((prev) => !prev)}
              className={`px-3 py-1 text-xs font-sans font-medium rounded-md transition-colors ${
                focusMode
                  ? 'bg-sienna-400 text-cream-50'
                  : 'text-ink-400 dark:text-ink-300 hover:text-ink-600 dark:hover:text-ink-100'
              }`}
              title={focusMode ? 'Exit focus mode' : 'Focus mode — hide notes, expand reading area'}
            >
              Focus
            </button>
            <div className="w-px h-5 bg-cream-300 dark:bg-ink-700" />
            <ExportControls markdown={markdown} annotations={annotations} />
            {sourceUrl && (
              <>
                <div className="w-px h-5 bg-cream-300 dark:bg-ink-700" />
                <button
                  onClick={handleShare}
                  className="px-3 py-1 text-xs font-sans font-medium rounded-md transition-colors text-ink-400 dark:text-ink-300 hover:text-ink-600 dark:hover:text-ink-100"
                  title="Copy share link"
                >
                  {shareCopied ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  )}
                </button>
              </>
            )}
            <div className="w-px h-5 bg-cream-300 dark:bg-ink-700" />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      {/* Main content area — single scroll container for document + sidebar */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="flex min-h-full">
          {/* Document */}
          <main className="flex-1 px-12 py-8 lg:px-20 xl:px-28">
            <div
              className="mx-auto transition-[max-width] duration-300 ease-out"
              style={{ maxWidth: focusMode ? '64rem' : '48rem' }}
            >
              {viewMode === 'rendered' ? (
                <DocumentView
                  markdown={markdown}
                  annotations={annotations}
                  activeAnnotationId={activeAnnotationId}
                  baseUrl={baseUrl}
                  onAddAnnotation={addAnnotation}
                  onActivateAnnotation={handleAnnotationActivate}
                  onUpdateAnnotation={updateAnnotation}
                  onDeleteAnnotation={deleteAnnotation}
                  onEditMarkdown={handleEditMarkdown}
                />
              ) : (
                <RawView markdown={markdown} />
              )}
            </div>
          </main>

          {/* Sidebar — animates out in focus mode */}
          <Sidebar
            annotations={annotations}
            activeAnnotationId={activeAnnotationId}
            collapsed={sidebarCollapsed}
            focusMode={focusMode}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
            onActivate={handleAnnotationActivate}
            onUpdate={updateAnnotation}
            onDelete={deleteAnnotation}
            scrollContainerRef={scrollContainerRef}
          />
        </div>
      </div>
    </div>
  );
}
