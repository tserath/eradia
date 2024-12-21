// src/components/sidebar/FileTree.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, FileText, Edit2, Trash } from 'lucide-react';
import ConfirmationDialog from '../shared/ConfirmationDialog';
import RenameDialog from '../shared/FilesRenameDialog';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import { format, parseISO } from 'date-fns';

const FileTree = ({ entries, onOpenEntry, onRenameEntry, onDeleteEntry }) => {
  const [structure, setStructure] = useState({});
  const [expanded, setExpanded] = useState({});
  const [contextMenu, setContextMenu] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);

  useEffect(() => {
    const newStructure = {};
    
    // Convert entries Map to array if needed
    const entriesArray = entries instanceof Map ? Array.from(entries.values()) : entries;
    
    if (!entriesArray?.length) return;

    entriesArray.forEach((entry) => {
      if (!entry.created || entry.type === 'writing') return;
      
      const date = new Date(entry.created);
      if (isNaN(date.getTime())) return;
      
      const year = date.getFullYear();
      const month = date.toLocaleString('default', { month: 'long' });
      const day = date.getDate().toString().padStart(2, '0');
      
      if (!newStructure[year]) newStructure[year] = {};
      if (!newStructure[year][month]) newStructure[year][month] = {};
      if (!newStructure[year][month][day]) newStructure[year][month][day] = [];
      
      newStructure[year][month][day].push(entry);
    });
    
    setStructure(newStructure);
    
    // Auto-expand current year
    const currentYear = new Date().getFullYear();
    if (newStructure[currentYear]) {
      setExpanded(prev => ({ ...prev, [currentYear]: true }));
    }
  }, [entries]);

  const handleContextMenu = useCallback((event, entry) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedEntry(entry);
    setContextMenu({
      x: event.clientX,
      y: event.clientY
    });
  }, []);

  const handleRename = useCallback(() => {
    if (selectedEntry) {
      setShowRenameDialog(true);
    }
    setContextMenu(null);
  }, [selectedEntry]);

  const handleDelete = useCallback(() => {
    if (selectedEntry) {
      setShowDeleteConfirm(selectedEntry);
    }
    setContextMenu(null);
  }, [selectedEntry]);

  const handleDeleteConfirm = useCallback(() => {
    if (showDeleteConfirm) {
      onDeleteEntry(showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  }, [showDeleteConfirm, onDeleteEntry]);

  const handleNodeClick = useCallback((event, entry) => {
    event.preventDefault();
    event.stopPropagation();
    if (entry) {
      onOpenEntry(entry);
    }
  }, [onOpenEntry]);

  const TreeNode = ({ label, children, nodeKey, level = 0, entry }) => (
    <div className="relative">
      <div
        className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700
                   ${level > 0 ? 'pl-' + (level * 4) : ''}`}
        onClick={(event) => setExpanded(prev => ({ ...prev, [nodeKey]: !prev[nodeKey] }))}
        onContextMenu={(event) => entry && handleContextMenu(event, entry)}
      >
        {children && (
          expanded[nodeKey] ? 
            <ChevronDown className="w-4 h-4 mr-2 flex-none" /> :
            <ChevronRight className="w-4 h-4 mr-2 flex-none" />
        )}
        <span className="truncate">{label}</span>
      </div>
      {expanded[nodeKey] && children}
    </div>
  );

  const FileEntry = ({ entry, level = 3 }) => (
    <div
      className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700
                 ${selectedEntry?.id === entry.id ? 'bg-gray-200 dark:bg-gray-600' : ''}
                 pl-${level * 4}`}
      onClick={(event) => handleNodeClick(event, entry)}
      onContextMenu={(event) => handleContextMenu(event, entry)}
    >
      <FileText className="w-4 h-4 mr-2 flex-none text-text-muted dark:text-text-muted-dark" />
      <span className="flex-1 truncate">{entry.title || 'Untitled'}</span>
      <span className="text-xs text-text-muted dark:text-text-muted-dark">
        {format(typeof entry.created === 'string' ? parseISO(entry.created) : entry.created, 'HH:mm')}
      </span>
    </div>
  );

  const renderTree = () => {
    return Object.entries(structure).map(([year, months]) => (
      <TreeNode key={year} label={year} nodeKey={year} entry={null}>
        {expanded[year] && Object.entries(months).map(([month, days]) => (
          <TreeNode key={`${year}-${month}`} label={month} nodeKey={`${year}-${month}`} level={1} entry={null}>
            {expanded[`${year}-${month}`] && Object.entries(days).map(([day, entries]) => (
              <TreeNode key={`${year}-${month}-${day}`} label={day} nodeKey={`${year}-${month}-${day}`} level={2} entry={null}>
                {expanded[`${year}-${month}-${day}`] && entries.map(entry => (
                  <FileEntry key={entry.id} entry={entry} />
                ))}
              </TreeNode>
            ))}
          </TreeNode>
        ))}
      </TreeNode>
    ));
  };

  return (
    <div 
      className="p-4"
      onContextMenu={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
          event.stopPropagation();
          setSelectedEntry(null);
          setContextMenu({
            x: event.clientX,
            y: event.clientY
          });
        }
      }}
    >
      {Object.keys(structure).length > 0 ? (
        renderTree()
      ) : (
        <div className="text-center text-text-muted dark:text-text-muted-dark py-4">
          No entries found
        </div>
      )}
      
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        >
          <ContextMenuItem
            icon={Edit2}
            onClick={handleRename}
          >
            Rename
          </ContextMenuItem>
          <ContextMenuItem
            icon={Trash}
            onClick={handleDelete}
            className="text-red-500 dark:text-red-400"
          >
            Delete
          </ContextMenuItem>
        </ContextMenu>
      )}

      {showDeleteConfirm && (
        <ConfirmationDialog
          title="Delete Entry"
          message={`Are you sure you want to delete "${showDeleteConfirm.title || 'Untitled'}"?`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}

      {showRenameDialog && selectedEntry && (
        <RenameDialog
          isOpen={showRenameDialog}
          title={selectedEntry.title}
          onConfirm={(newTitle) => {
            onRenameEntry && onRenameEntry(selectedEntry, newTitle);
            setShowRenameDialog(false);
          }}
          onClose={() => setShowRenameDialog(false)}
          onCancel={() => setShowRenameDialog(false)}
        />
      )}
    </div>
  );
};

export default FileTree;