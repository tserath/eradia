import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';

const MoveDialog = ({ isOpen, onClose, onMove, tree, currentPath }) => {
  const [selectedPath, setSelectedPath] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [newName, setNewName] = useState(currentPath?.split('/')?.pop() || '');
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [conflictPath, setConflictPath] = useState(null);

  useEffect(() => {
    if (isOpen && currentPath) {
      // Expand all parent directories of the current path
      const pathParts = currentPath.split('/');
      const expandedPaths = new Set();
      let currentExpandedPath = '';
      pathParts.forEach((part, index) => {
        if (index < pathParts.length - 1) { // Don't expand the last part (file name)
          currentExpandedPath = currentExpandedPath ? `${currentExpandedPath}/${part}` : part;
          expandedPaths.add(currentExpandedPath);
        }
      });
      setExpandedNodes(expandedPaths);
      
      // Set initial selected path to the parent directory
      setSelectedPath(currentPath.split('/').slice(0, -1).join('/'));
      setNewName(currentPath.split('/').pop());
    }
  }, [isOpen, currentPath]);

  const toggleNode = (path) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelect = (node, path) => {
    if (node?.type === 'directory') {
      setSelectedPath(path);
    }
  };

  const handleMove = async (overwrite = false) => {
    if (!selectedPath || !newName) return;
    const targetPath = selectedPath ? `${selectedPath}/${newName}` : newName;
    if (targetPath === currentPath) {
      onClose();
      return;
    }
    try {
      await onMove(targetPath, overwrite);
      setShowOverwriteDialog(false);
      onClose();
    } catch (error) {
      if (error.code === 'FILE_EXISTS') {
        setConflictPath(error.targetPath);
        setShowOverwriteDialog(true);
      } else {
        console.error('Error moving file:', error);
        alert('Failed to move file: ' + error.message);
      }
    }
  };

  const renderNode = (node, path = '') => {
    if (!node) return null;
    
    const currentNodePath = path ? `${path}/${node.name}` : node.name;
    const isExpanded = expandedNodes.has(currentNodePath);
    const isSelected = selectedPath === currentNodePath;

    return (
      <div key={currentNodePath}>
        <div
          className={`flex items-center py-1 px-2 rounded cursor-pointer
                     ${isSelected ? 'bg-secondary dark:bg-secondary-dark' : 'hover:bg-secondary/50 dark:hover:bg-secondary-dark/50'}`}
          onClick={() => {
            if (node.type === 'directory') {
              toggleNode(currentNodePath);
            }
            handleSelect(node, currentNodePath);
          }}
        >
          {node.type === 'directory' && (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 mr-2 flex-none" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-2 flex-none" />
            )
          )}
          {node.type === 'directory' ? (
            <Folder className="w-4 h-4 mr-2 flex-none" />
          ) : (
            <File className="w-4 h-4 mr-2 flex-none" />
          )}
          <span className="truncate">{node.name}</span>
        </div>
        {node.type === 'directory' && isExpanded && node.children && (
          <div className="ml-4">
            {node.children.map((childNode) =>
              renderNode(childNode, currentNodePath)
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="w-96 max-h-[80vh] flex flex-col bg-primary dark:bg-primary-dark rounded-lg shadow-lg">
        <div className="flex justify-between items-center p-4 border-b border-border dark:border-border-dark">
          <h2 className="text-lg font-semibold">Move to...</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-[300px] border-b border-border dark:border-border-dark">
          {renderNode(tree)}
        </div>

        <div className="p-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 bg-secondary/20 dark:bg-secondary-dark/20 rounded 
                     border border-border dark:border-border-dark 
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end gap-2 p-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary-hover 
                     dark:bg-secondary-dark dark:hover:bg-secondary-dark-hover transition-smooth"
          >
            Cancel
          </button>
          <button
            onClick={() => handleMove()}
            disabled={!selectedPath || !newName}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover 
                     dark:bg-accent-dark dark:hover:bg-accent-dark-hover text-white 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
          >
            Move
          </button>
        </div>

        {showOverwriteDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
            <div className="bg-primary dark:bg-primary-dark rounded-lg shadow-lg p-6 max-w-md">
              <h3 className="text-lg font-semibold mb-4">File Already Exists</h3>
              <p className="mb-6">
                A file with the name "{newName}" already exists in this location. Do you want to overwrite it?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowOverwriteDialog(false)}
                  className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary-hover 
                           dark:bg-secondary-dark dark:hover:bg-secondary-dark-hover transition-smooth"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleMove(true)}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-smooth"
                >
                  Overwrite
                </button>
                <button
                  onClick={() => {
                    setShowOverwriteDialog(false);
                    // Reset name to original + _copy
                    setNewName(prev => {
                      const baseName = prev.replace(/\.md$/, '');
                      return `${baseName}_copy.md`;
                    });
                  }}
                  className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover 
                           dark:bg-accent-dark dark:hover:bg-accent-dark-hover text-white 
                           transition-smooth"
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoveDialog;
