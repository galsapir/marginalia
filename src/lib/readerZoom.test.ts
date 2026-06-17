// ABOUTME: Tests reader zoom keyboard shortcuts and bounded zoom steps.
// ABOUTME: Verifies document zoom behaves like app-level zoom, not browser zoom.

import { describe, expect, it } from 'vitest';
import {
  READER_ZOOM_LEVELS,
  getReaderZoomStyle,
  getNextReaderZoom,
  getReaderZoomShortcut,
} from './readerZoom';

describe('getReaderZoomShortcut', () => {
  it('recognizes command plus from plus and equals keys', () => {
    expect(getReaderZoomShortcut({ key: '+', metaKey: true, ctrlKey: false, altKey: false })).toBe('in');
    expect(getReaderZoomShortcut({ key: '=', metaKey: true, ctrlKey: false, altKey: false })).toBe('in');
  });

  it('recognizes command minus', () => {
    expect(getReaderZoomShortcut({ key: '-', metaKey: true, ctrlKey: false, altKey: false })).toBe('out');
  });

  it('supports control shortcuts and ignores unrelated keys', () => {
    expect(getReaderZoomShortcut({ key: '+', metaKey: false, ctrlKey: true, altKey: false })).toBe('in');
    expect(getReaderZoomShortcut({ key: '0', metaKey: true, ctrlKey: false, altKey: false })).toBeNull();
    expect(getReaderZoomShortcut({ key: '+', metaKey: false, ctrlKey: false, altKey: false })).toBeNull();
  });
});

describe('getNextReaderZoom', () => {
  it('moves through fixed zoom levels and clamps at the ends', () => {
    expect(getNextReaderZoom(1, 'in')).toBe(1.1);
    expect(getNextReaderZoom(1, 'out')).toBe(0.9);
    expect(getNextReaderZoom(READER_ZOOM_LEVELS[READER_ZOOM_LEVELS.length - 1], 'in')).toBe(
      READER_ZOOM_LEVELS[READER_ZOOM_LEVELS.length - 1],
    );
    expect(getNextReaderZoom(READER_ZOOM_LEVELS[0], 'out')).toBe(READER_ZOOM_LEVELS[0]);
  });

  it('snaps unknown current values to the next sensible level', () => {
    expect(getNextReaderZoom(1.05, 'in')).toBe(1.1);
    expect(getNextReaderZoom(1.05, 'out')).toBe(1);
  });
});

describe('getReaderZoomStyle', () => {
  it('scales type and clamps reader width to its container', () => {
    expect(getReaderZoomStyle(1.6, true)).toEqual({
      '--reader-font-size': '28.8px',
      width: '100%',
      maxWidth: 'min(102.4rem, 100%)',
    });
  });
});
