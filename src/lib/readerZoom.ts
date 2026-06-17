// ABOUTME: Provides bounded reader zoom steps and keyboard shortcut parsing.
// ABOUTME: Keeps document zoom behavior separate from browser page zoom.

export type ReaderZoomDirection = 'in' | 'out';

export interface ReaderZoomStyle {
  '--reader-font-size': string;
  width: string;
  maxWidth: string;
}

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

export function getReaderZoomStyle(readerZoom: number, focusMode: boolean): ReaderZoomStyle {
  const baseMeasureRem = focusMode ? 64 : 48;

  return {
    '--reader-font-size': `${formatStyleNumber(18 * readerZoom)}px`,
    width: '100%',
    maxWidth: `min(${formatStyleNumber(baseMeasureRem * readerZoom)}rem, 100%)`,
  };
}

function formatStyleNumber(value: number): string {
  return Number(value.toFixed(3)).toString();
}
