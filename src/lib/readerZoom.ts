// ABOUTME: Provides bounded reader zoom steps and keyboard shortcut parsing.
// ABOUTME: Keeps document zoom behavior separate from browser page zoom.

export type ReaderZoomDirection = 'in' | 'out';

interface ReaderZoomKeyEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

export const READER_ZOOM_LEVELS = [0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6] as const;

export function getReaderZoomShortcut(event: ReaderZoomKeyEvent): ReaderZoomDirection | null {
  if (event.altKey || (!event.metaKey && !event.ctrlKey)) return null;

  if (event.key === '+' || event.key === '=') return 'in';
  if (event.key === '-' || event.key === '_') return 'out';

  return null;
}

export function getNextReaderZoom(currentZoom: number, direction: ReaderZoomDirection): number {
  if (direction === 'in') {
    return READER_ZOOM_LEVELS.find((level) => level > currentZoom + 0.001) ?? READER_ZOOM_LEVELS[READER_ZOOM_LEVELS.length - 1];
  }

  for (let i = READER_ZOOM_LEVELS.length - 1; i >= 0; i -= 1) {
    const level = READER_ZOOM_LEVELS[i];
    if (level < currentZoom - 0.001) return level;
  }

  return READER_ZOOM_LEVELS[0];
}
