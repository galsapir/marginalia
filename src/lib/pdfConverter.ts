// ABOUTME: Browser-based PDF to markdown converter using pdf.js.
// ABOUTME: Extracts text with font-size heuristics to detect headings and structure.

import * as pdfjs from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface ExtractedLine {
  text: string;
  fontSize: number;
  y: number;
  x: number;
}

function getFontSize(transform: number[]): number {
  return Math.sqrt(transform[1] ** 2 + transform[3] ** 2);
}

/**
 * Groups text items into lines based on Y-position proximity,
 * then applies font-size heuristics to infer markdown structure.
 */
function itemsToLines(
  items: TextItem[],
  pageHeight: number,
): ExtractedLine[] {
  const lines: ExtractedLine[] = [];
  let currentLine: { texts: string[]; fontSize: number; y: number; x: number } | null = null;

  function flushLine() {
    if (!currentLine) return;
    const text = currentLine.texts.join('');
    if (text.trim()) {
      lines.push({
        text,
        fontSize: currentLine.fontSize,
        y: currentLine.y,
        x: currentLine.x,
      });
    }
    currentLine = null;
  }

  for (const item of items) {
    if (!item.str && !item.hasEOL) continue;

    const fontSize = getFontSize(item.transform);
    const y = pageHeight - item.transform[5];
    const x = item.transform[4];

    if (
      currentLine === null ||
      Math.abs(y - currentLine.y) > fontSize * 0.5
    ) {
      flushLine();
      currentLine = { texts: [item.str], fontSize, y, x };
    } else {
      currentLine.texts.push(item.str);
      if (fontSize > currentLine.fontSize) {
        currentLine.fontSize = fontSize;
      }
    }

    if (item.hasEOL) {
      flushLine();
    }
  }

  flushLine();
  return lines;
}

/**
 * Converts extracted lines into markdown using font-size analysis.
 * Larger fonts become headings; body text becomes paragraphs.
 */
function linesToMarkdown(allLines: ExtractedLine[]): string {
  if (allLines.length === 0) return '';

  // Determine the most common (body) font size
  const fontSizeCounts = new Map<number, number>();
  for (const line of allLines) {
    const rounded = Math.round(line.fontSize * 2) / 2; // round to 0.5
    fontSizeCounts.set(rounded, (fontSizeCounts.get(rounded) || 0) + 1);
  }

  let bodyFontSize = 12;
  let maxCount = 0;
  for (const [size, count] of fontSizeCounts) {
    if (count > maxCount) {
      maxCount = count;
      bodyFontSize = size;
    }
  }

  const mdLines: string[] = [];
  let prevWasHeading = false;

  for (const line of allLines) {
    const ratio = line.fontSize / bodyFontSize;
    const trimmed = line.text.trim();
    if (!trimmed) continue;

    if (ratio >= 1.8) {
      // Large heading (h1)
      if (mdLines.length > 0) mdLines.push('');
      mdLines.push(`# ${trimmed}`);
      prevWasHeading = true;
    } else if (ratio >= 1.4) {
      // Medium heading (h2)
      if (mdLines.length > 0) mdLines.push('');
      mdLines.push(`## ${trimmed}`);
      prevWasHeading = true;
    } else if (ratio >= 1.15) {
      // Small heading (h3)
      if (mdLines.length > 0) mdLines.push('');
      mdLines.push(`### ${trimmed}`);
      prevWasHeading = true;
    } else {
      // Body text — group consecutive body lines into paragraphs
      if (prevWasHeading) {
        mdLines.push('');
      }
      mdLines.push(trimmed);
      prevWasHeading = false;
    }
  }

  // Join and clean up: collapse 3+ blank lines into 2
  return mdLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface ConversionProgress {
  current: number;
  total: number;
}

/**
 * Extract text from a PDF file and convert to markdown.
 * Uses font-size heuristics for heading detection.
 */
export async function pdfToMarkdown(
  file: File,
  onProgress?: (progress: ConversionProgress) => void,
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const allLines: ExtractedLine[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    onProgress?.({ current: pageNum, total: pdf.numPages });

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    const items = textContent.items.filter(
      (item): item is TextItem => 'str' in item,
    );

    const pageLines = itemsToLines(items, viewport.height);
    allLines.push(...pageLines);
  }

  return linesToMarkdown(allLines);
}

/**
 * Returns the raw extracted text without markdown formatting.
 * Useful as input for LLM structuring.
 */
export async function pdfToRawText(
  file: File,
  onProgress?: (progress: ConversionProgress) => void,
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    onProgress?.({ current: pageNum, total: pdf.numPages });

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const text = textContent.items
      .filter((item): item is TextItem => 'str' in item)
      .map((item) => item.str + (item.hasEOL ? '\n' : ''))
      .join('');

    pages.push(text);
  }

  return pages.join('\n\n---\n\n');
}
