// ABOUTME: Shared file utilities for reading and validating uploaded files.
// ABOUTME: Used by drag-and-drop handlers across the app. Supports markdown and PDF.

export type SupportedFileType = 'markdown' | 'pdf' | 'unsupported';

export function getFileType(file: File): SupportedFileType {
  const name = file.name.toLowerCase();

  if (
    name.endsWith('.md') ||
    name.endsWith('.markdown') ||
    name.endsWith('.mdown') ||
    name.endsWith('.mkd') ||
    name.endsWith('.txt') ||
    file.type === 'text/markdown' ||
    file.type === 'text/plain'
  ) {
    return 'markdown';
  }

  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    return 'pdf';
  }

  return 'unsupported';
}

export function isMarkdownFile(file: File): boolean {
  return getFileType(file) === 'markdown';
}

export function isPdfFile(file: File): boolean {
  return getFileType(file) === 'pdf';
}

export function isSupportedFile(file: File): boolean {
  return getFileType(file) !== 'unsupported';
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
