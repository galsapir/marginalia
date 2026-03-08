// ABOUTME: Hook for drag-to-resize behavior on a sidebar's left edge.
// ABOUTME: Attaches document listeners only during an active drag.

import { useState, useRef, useCallback } from 'react';

interface UseDragResizeOptions {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function useDragResize({
  defaultWidth = 320,
  minWidth = 200,
  maxWidth = 600,
}: UseDragResizeOptions = {}) {
  const [width, setWidth] = useState(defaultWidth);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const handleMouseMove = (e: MouseEvent) => {
        const delta = startX.current - e.clientX;
        setWidth(Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta)));
      };

      const handleMouseUp = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [width, minWidth, maxWidth],
  );

  return { width, handleMouseDown };
}
