import React, { useEffect, useCallback, memo, useRef } from 'react';

interface ResizableContainerProps {
  children: React.ReactNode;
  minHeight: number;
  maxHeight: number;
  height: number;
  onHeightChange: (height: number) => void;
}

const ResizableContainer: React.FC<ResizableContainerProps> = memo(({
  children,
  minHeight,
  maxHeight,
  height,
  onHeightChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      startYRef.current = e.clientY;
      startHeightRef.current = rect.height;
      isDraggingRef.current = true;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingRef.current && containerRef.current) {
      const deltaY = e.clientY - startYRef.current;
      const newHeight = Math.min(Math.max(startHeightRef.current + deltaY, minHeight), maxHeight);
      containerRef.current.style.height = `${newHeight}px`;
    }
  }, [minHeight, maxHeight]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    if (containerRef.current) {
      const newHeight = containerRef.current.getBoundingClientRect().height;
      onHeightChange(newHeight);
    }
  }, [onHeightChange]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.height = `${height}px`;
    }
  }, [height]);

  return (
    <div 
      ref={containerRef}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          cursor: 'ns-resize',
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
});

export default ResizableContainer;