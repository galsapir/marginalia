// ABOUTME: Shared file utilities for reading and validating markdown files.
// ABOUTME: Used by drag-and-drop handlers across the app.

export function isMarkdownFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith('.md') ||
    name.endsWith('.markdown') ||
    name.endsWith('.mdown') ||
    name.endsWith('.mkd') ||
    name.endsWith('.txt') ||
    file.type === 'text/markdown' ||
    file.type === 'text/plain'
  );
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
