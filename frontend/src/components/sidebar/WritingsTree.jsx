import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { FolderPlus, Edit, MoveVertical, Trash } from 'lucide-react';
import { useApi } from '../../api/api';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import MoveDialog from '../dialog/MoveDialog';
import DeleteDialog from '../dialog/DeleteDialog';
import RenameDialog from '../dialog/RenameDialog';

const WritingsTree = React.forwardRef(({ onOpenEntry, onRenameEntry, onDeleteEntry }, ref) => {
  const [tree, setTree] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const treeRef = useRef(null);
  const api = useApi();

  const refreshTree = useCallback(async () => {
    try {
      const writings = await api.loadWritings();
      if (writings && (writings.children || writings.files || writings.directories)) {
        if (JSON.stringify(writings) !== JSON.stringify(tree)) {
          setTree(writings);
        }
      }
    } catch (error) {
      console.error('Error refreshing writings tree:', error);
      if (!tree) {
        const backupWritings = localStorage.getItem('eradia_writings_backup');
        if (backupWritings) {
          try {
            const writings = JSON.parse(backupWritings);
            if (writings && (writings.children || writings.files || writings.directories)) {
              setTree(writings);
            }
          } catch (parseError) {
            console.error('Error parsing backup writings:', parseError);
          }
        }
      }
    }
  }, [api, tree]);

  useEffect(() => {
    if (ref) {
      ref.current = { refreshTree };
    }
  }, [ref, refreshTree]);

  useEffect(() => {
    let mounted = true;
    let intervalId = null;
    
    const loadInitialData = async () => {
      try {
        if (mounted) {
          await refreshTree();
          intervalId = setInterval(() => {
            if (mounted) {
              refreshTree();
            }
          }, 120000); // 2 minutes
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    
    loadInitialData();

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [refreshTree]);

  const toggleNode = useCallback((path) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((e, node) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setSelectedNode(node);
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
  }, []);

  const handleCreateFolder = useCallback(async () => {
    try {
      const basePath = selectedNode ? selectedNode.path : '';
      const newPath = basePath ? `${basePath}/New Folder` : 'New Folder';
      await api.createDirectory(newPath);
      await refreshTree();
      setContextMenu(null);
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  }, [selectedNode, api, refreshTree]);

  const handleRenameEntry = useCallback(async (node, newName) => {
    if (!node?.path) return;
    
    try {
      // Get the directory path and new path
      const dirPath = node.path.substring(0, node.path.lastIndexOf('/'));
      const basePath = node.path.replace(/\.(md|json)$/, '');
      const newBasePath = dirPath ? `${dirPath}/${newName}` : newName;
      
      // Call the move API to rename
      await api.moveEntry(basePath, newBasePath);
      await refreshTree();
      setContextMenu(null);
    } catch (error) {
      console.error('Error renaming writing:', error);
    }
  }, [api, refreshTree]);

  const handleMoveConfirm = useCallback(async (targetPath) => {
    if (!selectedNode?.path) return;
    
    try {
      // Clean paths by removing .md extension
      const sourcePath = selectedNode.path.replace(/\.md$/, '');
      const destPath = targetPath.replace(/\.md$/, '');
      
      await api.moveEntry(sourcePath, destPath);
      
      // Update open entries if callback exists
      if (onRenameEntry) {
        // Pass the clean paths for consistent handling
        onRenameEntry(sourcePath, destPath);
      }
      
      await refreshTree();
      setShowMoveDialog(false);
    } catch (error) {
      if (error.code === 'FILE_EXISTS') {
        // Handle file exists error
        const overwrite = window.confirm('A file with this name already exists. Do you want to overwrite it?');
        if (overwrite) {
          try {
            const sourcePath = selectedNode.path.replace(/\.md$/, '');
            const destPath = targetPath.replace(/\.md$/, '');
            
            await api.moveEntry(sourcePath, destPath, true);
            
            // Update open entries if callback exists
            if (onRenameEntry) {
              // Pass the clean paths for consistent handling
              onRenameEntry(sourcePath, destPath);
            }
            
            await refreshTree();
            setShowMoveDialog(false);
          } catch (moveError) {
            console.error('Error moving file:', moveError);
            alert('Failed to move file: ' + moveError.message);
          }
        }
      } else {
        console.error('Error moving file:', error);
        alert('Failed to move file: ' + error.message);
      }
    }
  }, [selectedNode, api, refreshTree, onRenameEntry]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedNode?.path) return;
    
    try {
      // Delete the writing
      await api.deleteWriting(selectedNode.path);
      
      // Notify parent if callback exists (this should close the window)
      if (onDeleteEntry) {
        onDeleteEntry(selectedNode.path);
      }
      
      // Clear selected node
      setSelectedNode(null);
      
      // Close the delete dialog
      setShowDeleteDialog(false);
      
      // Refresh the tree to reflect changes
      await refreshTree();
    } catch (error) {
      console.error('Error deleting writing:', error);
      // Dialog will stay open due to the error handling in DeleteDialog
    }
  }, [selectedNode, api, refreshTree, onDeleteEntry]);

  const handleNodeClick = useCallback((node, nodePath) => {
    if (node.type === 'file') {
      const cleanPath = nodePath.replace(/\.md$/, '');
      onOpenEntry && onOpenEntry({
        type: 'writing',
        path: cleanPath,
        id: cleanPath,
        title: node.name.replace(/\.md$/, '')
      });
    }
  }, [onOpenEntry]);

  const renderNode = useCallback((node, path = '', level = 0) => {
    const isDirectory = node.type === 'directory';
    const nodePath = path ? `${path}/${node.name}` : node.name;
    const isExpanded = expandedNodes.has(nodePath);

    return (
      <div key={nodePath} className="relative">
        <div
          className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700
                     ${selectedNode?.path === nodePath ? 'bg-gray-200 dark:bg-gray-600' : ''}
                     ${level > 0 ? 'pl-' + (level * 4) : ''}`}
          onClick={() => {
            if (isDirectory) {
              toggleNode(nodePath);
            } else {
              handleNodeClick(node, nodePath);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, { ...node, path: nodePath })}
        >
          {isDirectory ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 mr-2 flex-none" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2 flex-none" />
              )}
              <Folder className="w-4 h-4 mr-2 flex-none text-text-muted dark:text-text-muted-dark" />
            </>
          ) : (
            <>
              <div className="w-4 mr-2" />
              <File className="w-4 h-4 mr-2 flex-none text-text-muted dark:text-text-muted-dark" />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </div>
        
        {isDirectory && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, nodePath, level + 1))}
          </div>
        )}
      </div>
    );
  }, [expandedNodes, selectedNode, toggleNode, handleContextMenu, handleNodeClick]);

  if (!tree) {
    return <div className="p-4 text-text-muted dark:text-text-muted-dark">Loading...</div>;
  }

  return (
    <div 
      ref={treeRef} 
      className="p-4 min-h-full"
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          e.stopPropagation();
          setSelectedNode(null);
          setContextMenu({
            x: e.clientX,
            y: e.clientY
          });
        }
      }}
    >
      <div className="min-h-[200px]">
        {tree?.children?.length > 0 ? (
          tree.children.map(node => renderNode(node))
        ) : (
          <div className="text-text-muted dark:text-text-muted-dark">No writings found</div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        >
          <ContextMenuItem
            icon={FolderPlus}
            onClick={handleCreateFolder}
          >
            New Folder
          </ContextMenuItem>
          {selectedNode && (
            <>
              <ContextMenuItem
                icon={Edit}
                onClick={() => {
                  setShowRenameDialog(true);
                  setContextMenu(null);
                }}
              >
                Rename
              </ContextMenuItem>
              <ContextMenuItem
                icon={MoveVertical}
                onClick={() => {
                  setShowMoveDialog(true);
                  setContextMenu(null);
                }}
              >
                Move
              </ContextMenuItem>
              <ContextMenuItem
                icon={Trash}
                onClick={() => {
                  setShowDeleteDialog(true);
                  setContextMenu(null);
                }}
                className="text-red-500 dark:text-red-400"
              >
                Delete
              </ContextMenuItem>
            </>
          )}
        </ContextMenu>
      )}

      {showRenameDialog && selectedNode && (
        <RenameDialog
          isOpen={showRenameDialog}
          title={selectedNode.name.replace(/\.md$/, '')}
          onConfirm={(newName) => handleRenameEntry(selectedNode, newName)}
          onClose={() => setShowRenameDialog(false)}
        />
      )}

      {showMoveDialog && (
        <MoveDialog
          isOpen={showMoveDialog}
          tree={tree}
          currentPath={selectedNode?.path}
          onMove={handleMoveConfirm}
          onClose={() => setShowMoveDialog(false)}
        />
      )}

      {showDeleteDialog && (
        <DeleteDialog
          isOpen={showDeleteDialog}
          itemName={selectedNode?.name || 'item'}
          itemType={selectedNode?.type || 'file'}
          onConfirm={handleDeleteConfirm}
          onClose={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
});

export default WritingsTree;
