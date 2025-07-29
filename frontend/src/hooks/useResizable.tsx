import React, { useState, useCallback, useEffect, useRef } from 'react';

interface UseResizableProps {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export const useResizable = ({
  initialWidth = 25,
  minWidth = 10,
  maxWidth = 70
}: UseResizableProps = {}) => {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const resizeRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    setIsResizing(true);
  }, [width]);

  const resize = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const deltaX = e.clientX - startXRef.current;
    const deltaWidth = (deltaX / window.innerWidth) * 100;
    const newWidth = startWidthRef.current + deltaWidth;
    const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
    setWidth(clampedWidth);
  }, [minWidth, maxWidth]);

  const stopResize = useCallback((e?: MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsResizing(false);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      resize(e);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isResizing) return;
      stopResize(e);
    };

    if (isResizing) {
      // Use capture phase to ensure we get all events
      document.addEventListener('mousemove', handleMouseMove, { capture: true, passive: false });
      document.addEventListener('mouseup', handleMouseUp, { capture: true, passive: false });
      // Also listen on window for extra safety
      window.addEventListener('mousemove', handleMouseMove, { passive: false });
      window.addEventListener('mouseup', handleMouseUp, { passive: false });
      
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';
      // Re-enable pointer events on our resize handle
      if (resizeRef.current) {
        resizeRef.current.style.pointerEvents = 'auto';
      }
    } else {
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
    };
  }, [isResizing, resize, stopResize]);

  const ResizeHandle = () => (
    <div
      ref={resizeRef}
      onMouseDown={startResize}
      className={`absolute top-0 w-3 h-full cursor-col-resize flex items-center justify-center ${
        isResizing 
          ? 'bg-transparent'
          : 'hover:bg-gray-400 border-l border-r border-gray-400'
      }`}
      style={{ 
        zIndex: 60,
        left: 'calc(100% - 12px)',
        pointerEvents: 'auto',
        transition: isResizing ? 'none' : 'all 0.2s'
      }}
      title="Drag to resize panel"
    >
      {/* Visual indicator - three dots pattern */}
      <div className="flex flex-col space-y-1">
        <div className={`w-1 h-1 rounded-full ${isResizing ? 'bg-white' : 'bg-gray-600'}`}></div>
        <div className={`w-1 h-1 rounded-full ${isResizing ? 'bg-white' : 'bg-gray-600'}`}></div>
        <div className={`w-1 h-1 rounded-full ${isResizing ? 'bg-white' : 'bg-gray-600'}`}></div>
      </div>
    </div>
  );

  return {
    width,
    isResizing,
    ResizeHandle,
    setWidth
  };
}; 