import React, { useState, useEffect } from 'react';

const RenameDialog = ({ isOpen, title, onConfirm, onClose, onCancel }) => {
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    if (isOpen && title) {
      setNewTitle(title);
    }
  }, [isOpen, title]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onConfirm(newTitle.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Rename Entry</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full p-2 border rounded mb-4 dark:bg-gray-700 dark:border-gray-600"
            autoFocus
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onCancel || onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameDialog;
