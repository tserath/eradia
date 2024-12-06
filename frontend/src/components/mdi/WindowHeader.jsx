// src/components/mdi/WindowHeader.jsx
import React from 'react';
import { Edit2, Maximize2, Minimize2, X } from 'lucide-react';

const WindowHeader = ({ title, isMaximized, onMinimize, onMaximize, onClose }) => (
  <div className="window-header flex items-center justify-between px-4 py-2 
    bg-secondary dark:bg-secondary-dark rounded-t-lg cursor-move transition-smooth">
    <div className="flex items-center gap-2">
      <Edit2 className="w-4 h-4" />
      <span className="font-medium">{title || 'Untitled'}</span>
    </div>
    <div className="flex items-center gap-2">
      {[
        { icon: Minimize2, onClick: onMinimize },
        { icon: isMaximized ? Minimize2 : Maximize2, onClick: onMaximize },
        { icon: X, onClick: onClose }
      ].map(({ icon: Icon, onClick }, i) => (
        <button
          key={i}
          className="p-1 hover:bg-primary dark:hover:bg-primary-dark rounded transition-smooth"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  </div>
);

export default WindowHeader;