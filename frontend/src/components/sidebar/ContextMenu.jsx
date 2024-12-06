import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export const ContextMenuItem = ({ onClick, children, icon: Icon, className = '' }) => {
  return (
    <button
      className={`flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${className}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onClick) onClick(e);
      }}
    >
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      <span>{children}</span>
    </button>
  );
};

const ContextMenu = ({ x, y, onClose, children }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('contextmenu', handleClickOutside);
    document.addEventListener('scroll', onClose);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
      document.removeEventListener('scroll', onClose);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden animate-fade-in"
      style={{ left: x, top: y }}
    >
      {children}
    </div>,
    document.body
  );
};

export default ContextMenu;