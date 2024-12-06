// src/components/mdi/MDIWindowManager.jsx
import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import MDIWindow from './MDIWindow';
import { createWindowState } from '../../config/windowDefaults';

const MDIWindowManager = forwardRef(({ entries = [], onUpdateEntry, onCloseEntry, editorRef, showSource }, ref) => {
  const containerRef = useRef(null);
  const [minimizedWindows, setMinimizedWindows] = useState(new Set());
  const [minimizedPositions, setMinimizedPositions] = useState(new Map());
  const [activeWindow, setActiveWindow] = useState(null);

  // Ensure entries is always an array
  const windowEntries = Array.isArray(entries) ? entries : (entries instanceof Map ? Array.from(entries.values()) : []);
  
  const activateWindow = (id) => {
    if (activeWindow === id) return;
    setActiveWindow(id);
    
    const entry = windowEntries.find(e => e && e.id === id);
    if (entry) {
      const maxZ = Math.max(0, ...windowEntries
        .filter(e => e && e.windowState && e.id !== id)
        .map(e => e.windowState.zIndex || 0)
      );
      
      onUpdateEntry(id, {
        windowState: {
          ...entry.windowState,
          zIndex: maxZ + 1
        }
      });
    }
  };

  const updateWindowState = (id, newState) => {
    const entry = windowEntries.find(e => e && e.id === id);
    if (!entry) return;

    // Handle content updates separately from window state
    if ('content' in newState) {
      onUpdateEntry(id, {
        content: newState.content,
        modified: new Date().toISOString()
      });
      return;
    }

    onUpdateEntry(id, {
      windowState: {
        ...entry.windowState,
        ...newState
      }
    });

    // Update minimized positions if needed
    if (minimizedWindows.has(id) && ('x' in newState || 'y' in newState)) {
      setMinimizedPositions(prev => {
        const next = new Map(prev);
        next.set(id, {
          ...next.get(id),
          x: newState.x,
          y: newState.y
        });
        return next;
      });
    }
  };

  const findAvailablePosition = (iconWidth, iconHeight, margin) => {
    if (!containerRef.current) return { x: margin, y: margin };
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const positions = Array.from(minimizedPositions.values());
    
    // Calculate the bottom position for all minimized windows
    const bottomY = containerRect.height - iconHeight - margin;
    
    // Create a grid of possible positions along the bottom
    const gridCols = Math.floor((containerRect.width - margin) / (iconWidth + margin));
    
    // Try each position from left to right along the bottom
    for (let col = 0; col < gridCols; col++) {
      const x = margin + (col * (iconWidth + margin));
      const y = bottomY;
      
      // Check if this position overlaps with any existing icons
      const isOccupied = positions.some(pos => {
        const xOverlap = Math.abs((pos.x || 0) - x) < iconWidth;
        const yOverlap = Math.abs((pos.y || 0) - y) < iconHeight;
        return xOverlap && yOverlap;
      });
      
      if (!isOccupied) {
        return { x, y };
      }
    }
    
    // If all positions at the bottom are occupied, stack them at the end
    const col = positions.length % gridCols;
    return {
      x: margin + (col * (iconWidth + margin)),
      y: bottomY
    };
  };

  const minimizeWindow = (id) => {
    const entry = windowEntries.find(e => e && e.id === id);
    if (!entry) return;

    const iconWidth = 160;
    const iconHeight = 32;
    const margin = 8;
    
    // Find the first available position that doesn't overlap
    const position = findAvailablePosition(iconWidth, iconHeight, margin);

    // Save the pre-minimize state and new position
    setMinimizedPositions(prev => {
      const next = new Map(prev);
      next.set(id, {
        x: position.x,
        y: position.y,
        preMinimizeState: {
          x: entry.windowState?.x,
          y: entry.windowState?.y,
          width: entry.windowState?.width,
          height: entry.windowState?.height,
          zIndex: entry.windowState?.zIndex
        }
      });
      return next;
    });

    // Add to minimized set
    setMinimizedWindows(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const restoreWindow = (id) => {
    const position = minimizedPositions.get(id);
    if (!position) return;

    const entry = windowEntries.find(e => e && e.id === id);
    if (!entry) return;

    const { preMinimizeState } = position;
    const existingZIndices = windowEntries.filter(e => e && e.windowState).map(e => e.windowState.zIndex || 0);
    const maxZ = existingZIndices.length > 0 ? Math.max(...existingZIndices) : 0;
    const newZIndex = maxZ + 1;

    // Remove from minimized windows
    setMinimizedWindows(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    // Remove from minimized positions
    setMinimizedPositions(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    // Restore window state with new z-index
    onUpdateEntry(id, {
      windowState: {
        ...entry.windowState,
        ...preMinimizeState,
        zIndex: newZIndex
      }
    });
  };

  const tileWindows = () => {
    const visibleWindows = windowEntries.filter(entry => entry && !minimizedWindows.has(entry.id));
    
    if (visibleWindows.length === 0 || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const cols = Math.ceil(Math.sqrt(visibleWindows.length));
    const rows = Math.ceil(visibleWindows.length / cols);
    const width = Math.floor(containerRect.width / cols);
    const height = Math.floor(containerRect.height / rows);
    
    visibleWindows.forEach((entry, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      onUpdateEntry(entry.id, {
        windowState: {
          ...entry.windowState,
          x: col * width,
          y: row * height,
          width,
          height
        }
      });
    });
  };

  const minimizeAll = () => {
    windowEntries.forEach(entry => entry && minimizeWindow(entry.id));
  };

  const cascadeWindows = () => {
    const visibleWindows = windowEntries.filter(entry => !minimizedWindows.has(entry.id));
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const offset = 32; // Offset for each cascaded window
    const minWidth = Math.min(589, containerRect.width * 0.589); // Increased by 15% from previous 51.2%
    const minHeight = Math.min(442, containerRect.height * 0.589); // Increased by 15% from previous 51.2%
    
    visibleWindows.forEach((entry, index) => {
      onUpdateEntry(entry.id, {
        windowState: {
          ...entry.windowState,
          zIndex: index + 1,
          width: minWidth,
          height: minHeight,
          x: offset * index,
          y: offset * index
        }
      });
    });
  };

  useImperativeHandle(ref, () => ({
    tileWindows,
    minimizeAll,
    cascadeWindows
  }));

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {windowEntries.map(entry => entry && (
        <MDIWindow
          key={entry.id}
          id={entry.id}
          entry={entry}
          isMinimized={minimizedWindows.has(entry.id)}
          minimizedPosition={minimizedPositions.get(entry.id)}
          maxZIndex={Math.max(...windowEntries.map(e => e?.windowState?.zIndex || 0), 0)}
          onActivate={activateWindow}
          onMinimize={minimizeWindow}
          onRestore={restoreWindow}
          onUpdateState={updateWindowState}
          onClose={onCloseEntry}
          editorRef={editorRef}
          showSource={showSource}
        />
      ))}
    </div>
  );
});

export default MDIWindowManager;