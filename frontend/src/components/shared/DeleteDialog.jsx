import React, { useState } from 'react';

const DeleteDialog = ({ isOpen, onClose, onConfirm, itemName, itemType }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  
  if (!isOpen) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error deleting item:', error);
      // Keep dialog open on error
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-gray-800 border border-border dark:border-border-dark rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Confirm Delete</h2>
        <p className="mb-6">
          Are you sure you want to delete {itemType} "{itemName}"?
          {itemType === 'directory' && (
            <span className="block mt-2 text-red-500">
              Warning: This will delete all contents of the directory!
            </span>
          )}
        </p>
        <div className="flex justify-end gap-4">
          <button
            className="px-4 py-2 rounded hover:bg-secondary/50 dark:hover:bg-secondary-dark/50 transition-smooth"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-smooth disabled:opacity-50"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteDialog;
