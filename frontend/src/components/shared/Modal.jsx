import React from 'react';
import { X } from 'lucide-react';

const ModalAction = ({ 
  onClick, 
  variant = 'secondary',
  children 
}) => {
  const variants = {
    primary: 'bg-accent hover:bg-accent-hover dark:bg-accent-dark dark:hover:bg-accent-dark-hover text-white',
    secondary: 'bg-secondary hover:bg-secondary-hover dark:bg-secondary-dark dark:hover:bg-secondary-dark-hover',
    danger: 'bg-red-500 hover:bg-red-600 text-white'
  };

  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-lg transition-smooth ${variants[variant]}`}
    >
      {children}
    </button>
  );
};

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  actions,
  width = 'max-w-2xl'
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`bg-primary dark:bg-primary-dark rounded-xl shadow-2xl ${width} overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-border-dark">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary/50 dark:hover:bg-secondary-dark/50 rounded-lg
                     text-text-muted dark:text-text-muted-dark transition-smooth"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-8">{children}</div>
        
        {actions && (
          <div className="flex justify-end gap-3 px-8 pb-8 pt-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

Modal.Action = ModalAction;
export default Modal;