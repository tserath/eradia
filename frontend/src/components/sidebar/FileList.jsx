import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { File, Edit, Trash } from 'lucide-react';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import { useAppSettings } from '../settings/AppSettingsContext';
import ConfirmationDialog from '../shared/ConfirmationDialog';
import RenameDialog from '../shared/FilesRenameDialog';

const FileList = ({ date, entries = [], onOpenEntry, onRenameEntry, onDeleteEntry, isMobile = false }) => {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const { showWritingsInFileList } = useAppSettings();

  const { filteredEntries, filteredCount } = useMemo(() => {
    if (!entries || !Array.isArray(entries) || !date) {
      return { filteredEntries: [], filteredCount: 0 };
    }

    const filtered = entries.filter(entry => {
      if (!entry?.created) return false;

      // On mobile, always filter out writings regardless of settings
      if (isMobile && entry.type === 'writing') {
        return false;
      }

      // On desktop, respect the showWritingsInFileList setting
      if (!isMobile && !showWritingsInFileList && entry.type === 'writing') {
        return false;
      }

      // For writings, we need to check if the path exists
      if (entry.type === 'writing' && !entry.path) {
        return false;
      }

      const entryDate = typeof entry.created === 'string' ? parseISO(entry.created) : entry.created;
      return format(entryDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });

    return {
      filteredEntries: filtered,
      filteredCount: filtered.length
    };
  }, [entries, date, showWritingsInFileList, isMobile]);

  const handleContextMenu = useCallback((e, entry) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedEntry(entry);
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
  }, []);

  useEffect(() => {
    console.log('Context menu state:', contextMenu);
    console.log('Selected entry:', selectedEntry);
  }, [contextMenu, selectedEntry]);

  const handleDeleteConfirm = useCallback(() => {
    if (showDeleteConfirm) {
      const id = showDeleteConfirm.id || showDeleteConfirm.path;
      if (id) {
        onDeleteEntry(id);
        setShowDeleteConfirm(null);
      } else {
        console.error('No valid ID found for entry:', showDeleteConfirm);
      }
    }
  }, [showDeleteConfirm, onDeleteEntry]);

  const handleClick = useCallback((e, entry) => {
    e.preventDefault();
    onOpenEntry(entry);
  }, [onOpenEntry]);

  if (!filteredCount) {
    return (
      <div className="text-text-muted dark:text-text-muted-dark text-sm">
        No entries for this date
      </div>
    );
  }

  return (
    <div className="space-y-2 relative">
      {filteredEntries.map(entry => (
        <div
          key={entry.id || entry.path}
          className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-secondary/50 dark:hover:bg-secondary-dark/50
                     ${selectedEntry?.id === entry.id ? 'bg-secondary dark:bg-secondary-dark' : ''}`}
          onClick={(e) => handleClick(e, entry)}
          onContextMenu={(e) => {
            handleContextMenu(e, entry);
          }}
        >
          <File className="w-4 h-4 mr-2 flex-none text-text-muted dark:text-text-muted-dark" />
          <span className="flex-1 truncate">{entry.title || 'Untitled'}</span>
          <span className="text-xs text-text-muted dark:text-text-muted-dark">
            {format(typeof entry.created === 'string' ? parseISO(entry.created) : entry.created, 'HH:mm')}
          </span>
        </div>
      ))}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        >
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
            icon={Trash}
            onClick={() => {
              setShowDeleteConfirm(selectedEntry);
              setContextMenu(null);
            }}
            className="text-red-500 dark:text-red-400"
          >
            Delete
          </ContextMenuItem>
        </ContextMenu>
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

      {showDeleteConfirm && (
        <ConfirmationDialog
          isOpen={!!showDeleteConfirm}
          title="Delete Entry"
          message={`Are you sure you want to delete "${showDeleteConfirm.title || 'Untitled'}"?`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onClose={() => setShowDeleteConfirm(null)}
          onCancel={() => setShowDeleteConfirm(null)}
          variant="danger"
        />
      )}
    </div>
  );
};

export default FileList;