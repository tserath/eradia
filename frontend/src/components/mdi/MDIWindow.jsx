import React, { useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Edit2, Minus, X } from 'lucide-react';
import RichTextEditor from '../editor/RichTextEditor';

const MDIWindow = ({
  id,
  entry,
  isMinimized,
  minimizedPosition,
  maxZIndex,
  onActivate,
  onMinimize,
  onRestore,
  onUpdateState,
  onClose,
  editorRef,
  showSource
}) => {
  const containerRef = useRef(null);

  // Function to ensure window stays within bounds
  const ensureInBounds = (x, y, width, height) => {
    if (!containerRef.current?.parentElement) return { x, y };

    const container = containerRef.current.parentElement;
    const containerRect = container.getBoundingClientRect();

    const minX = 0;
    const minY = 0;
    const maxX = Math.max(0, containerRect.width - width);
    const maxY = Math.max(0, containerRect.height - height);

    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY)
    };
  };

  const handleContentChange = (newContent) => {
    onUpdateState(id, {
      content: newContent,
      modified: new Date().toISOString()
    });
  };

  useEffect(() => {
  }, [id, onUpdateState]);

  if (isMinimized) {
    const position = minimizedPosition || { x: 0, y: 0 };
    return (
      <Rnd
        ref={containerRef}
        position={position}
        size={{ width: 160, height: 32 }}
        className={`fixed rounded-lg overflow-hidden shadow-lg border border-border dark:border-border-dark
                   ${maxZIndex === entry.windowState?.zIndex ? 'z-10' : 'z-0'}`}
        style={{ zIndex: maxZIndex }}
        enableResizing={false}
        dragHandleClassName="handle"
        bounds="parent"
        onDragStop={(e, d) => {
          const { x, y } = ensureInBounds(d.x, d.y, 160, 32);
          if (x !== position.x || y !== position.y) {
            onUpdateState(id, { x, y });
          }
        }}
      >
        <div 
          className="handle flex items-center justify-between px-2 py-1 bg-secondary dark:bg-secondary-dark"
          onClick={(e) => {
            if (e.detail === 2) { // Double click
              onRestore(id);
            }
          }}
        >
          <Edit2 className="w-4 h-4 flex-none" />
          <span className="flex-1 truncate text-sm">
            {entry.title || 'Untitled'}
          </span>
        </div>
      </Rnd>
    );
  }

  const isActive = maxZIndex === entry.windowState?.zIndex;

  return (
    <Rnd
      ref={containerRef}
      position={{ x: entry.windowState?.x || 0, y: entry.windowState?.y || 0 }}
      size={{
        width: entry.windowState?.width || 600,
        height: entry.windowState?.height || 400
      }}
      className={`fixed rounded-lg overflow-hidden shadow-lg border border-border dark:border-border-dark
                 ${maxZIndex === entry.windowState?.zIndex ? 'shadow-xl' : ''}`}
      style={{ zIndex: entry.windowState?.zIndex }}
      dragHandleClassName="handle"
      enableResizing={true}
      bounds="parent"
      minWidth={300}
      minHeight={200}
      onDragStart={() => onActivate(id)}
      onResizeStart={() => onActivate(id)}
      onDragStop={(e, d) => {
        const { x, y } = ensureInBounds(d.x, d.y, entry.windowState?.width || 600, entry.windowState?.height || 400);
        onUpdateState(id, { x, y });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        const { width, height } = ref.style;
        onUpdateState(id, {
          width: parseInt(width),
          height: parseInt(height),
          ...position
        });
      }}
    >
      <div className="flex flex-col h-full">
        <div 
          className={`handle flex items-center justify-between px-2 py-1 flex-none
                     ${maxZIndex === entry.windowState?.zIndex 
                       ? 'bg-accent dark:bg-accent-dark text-white'
                       : 'bg-secondary dark:bg-secondary-dark'}`}
          onDoubleClick={() => onActivate(id)}
        >
          <span className="text-sm font-medium truncate">
            {entry.title || 'Untitled'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onMinimize(id)}
              className="p-1 rounded hover:bg-secondary-hover dark:hover:bg-secondary-dark-hover transition-smooth"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={() => onClose(id)}
              className="p-1 rounded hover:bg-red-500 hover:text-white dark:hover:bg-red-600 transition-smooth"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-primary dark:bg-primary-dark" onClick={() => onActivate(id)}>
          <RichTextEditor
            ref={editorRef}
            content={entry.content}
            onChange={handleContentChange}
            showSource={showSource}
          />
        </div>
      </div>
    </Rnd>
  );
};

export default MDIWindow;