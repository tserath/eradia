import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';

const WritingsRenameDialog = ({ isOpen, title, onConfirm, onClose }) => {
  const [newName, setNewName] = useState(title || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newName.trim()) {
      onConfirm(newName.trim());
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm rounded bg-background dark:bg-background-dark p-6 shadow-xl">
          <Dialog.Title className="text-lg font-medium mb-4">Rename Item</Dialog.Title>
          
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full p-2 border rounded mb-4 bg-input dark:bg-input-dark text-text dark:text-text-dark"
              autoFocus
            />
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-primary hover:bg-primary-hover text-white"
              >
                Rename
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default WritingsRenameDialog;
