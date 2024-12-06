// src/components/editor/EditorToolbar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Heading3,
  List, ListOrdered,
  Quote, Code, Link,
  Plus, X, ChevronDown,
  Eye, Grid, Layout,
  LayoutDashboard, Layers
} from 'lucide-react';
import ConfirmationDialog from '../shared/ConfirmationDialog';

const ToolbarButton = ({ icon: Icon, title, onClick, active, rotate }) => (
  <button
    className={`p-1.5 rounded hover:bg-secondary dark:hover:bg-secondary-dark transition-smooth
               ${active ? 'bg-secondary dark:bg-secondary-dark' : ''}`}
    title={title}
    onClick={onClick}
  >
    <Icon className={`w-4 h-4 ${rotate ? 'transform rotate-180' : ''}`} />
  </button>
);

const EditorToolbar = ({ onNewEntry, onNewWriting, onCloseAll, editorRef, showSource, setShowSource, onSetView, viewMode, onWindowAction }) => {
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showCloseAllDialog, setShowCloseAllDialog] = useState(false);
  const newButtonRef = useRef(null);

  const handleFormatText = (command) => {
    const editor = editorRef?.current;
    if (!editor) {
      console.error('Editor reference not found');
      return;
    }

    try {
      editor.execCommand(command);
    } catch (err) {
      console.error('Format operation error:', err);
    }
  };

  useEffect(() => {
    console.log('showCloseAllDialog:', showCloseAllDialog);
  }, [showCloseAllDialog]);

  const handleCloseAll = () => {
    console.log('Opening close all dialog');
    setShowCloseAllDialog(true);
  };

  const handleConfirmCloseAll = () => {
    console.log('Confirming close all');
    onCloseAll();
    setShowCloseAllDialog(false);
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-1 bg-primary dark:bg-primary-dark
                      border-b border-border dark:border-border-dark">
        <div className="flex items-center gap-2">
          <div className="relative">
            <ToolbarButton
              icon={Plus}
              title="New"
              onClick={() => setShowNewMenu(!showNewMenu)}
            />

            {showNewMenu && (
              <div className="absolute z-[1000] mt-1 py-1 bg-primary dark:bg-primary-dark rounded-lg shadow-lg
                            border border-border dark:border-border-dark min-w-[120px]">
                <button
                  className="w-full px-3 py-1.5 text-left hover:bg-secondary dark:hover:bg-secondary-dark
                           transition-smooth"
                  onClick={() => {
                    onNewEntry();
                    setShowNewMenu(false);
                  }}
                >
                  Journal
                </button>
                <button
                  className="w-full px-3 py-1.5 text-left hover:bg-secondary dark:hover:bg-secondary-dark
                           transition-smooth"
                  onClick={() => {
                    onNewWriting();
                    setShowNewMenu(false);
                  }}
                >
                  Writing
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 px-2 border-r border-border dark:border-border-dark">
            <ToolbarButton
              icon={Bold}
              title="Bold"
              onClick={() => handleFormatText('bold')}
            />
            <ToolbarButton
              icon={Italic}
              title="Italic"
              onClick={() => handleFormatText('italic')}
            />
            <ToolbarButton
              icon={Underline}
              title="Underline"
              onClick={() => handleFormatText('underline')}
            />
            <ToolbarButton
              icon={Strikethrough}
              title="Strikethrough"
              onClick={() => handleFormatText('strikethrough')}
            />
          </div>

          <div className="flex items-center space-x-1">
            <ToolbarButton
              icon={AlignLeft}
              title="Align Left"
              onClick={() => handleFormatText('justifyLeft')}
            />
            <ToolbarButton
              icon={AlignCenter}
              title="Align Center"
              onClick={() => handleFormatText('justifyCenter')}
            />
            <ToolbarButton
              icon={AlignRight}
              title="Align Right"
              onClick={() => handleFormatText('justifyRight')}
            />
          </div>

          <div className="flex items-center space-x-1">
            <ToolbarButton
              icon={Heading1}
              title="Heading 1"
              onClick={() => handleFormatText('heading1')}
            />
            <ToolbarButton
              icon={Heading2}
              title="Heading 2"
              onClick={() => handleFormatText('heading2')}
            />
            <ToolbarButton
              icon={Heading3}
              title="Heading 3"
              onClick={() => handleFormatText('heading3')}
            />
          </div>

          <div className="flex items-center gap-1 px-2 border-r border-border dark:border-border-dark">
            <ToolbarButton
              icon={List}
              title="Bullet List"
              onClick={() => handleFormatText('bulletList')}
            />
            <ToolbarButton
              icon={ListOrdered}
              title="Numbered List"
              onClick={() => handleFormatText('orderedList')}
            />
          </div>

          <div className="flex items-center gap-1">
            <ToolbarButton
              icon={Quote}
              title="Quote"
              onClick={() => handleFormatText('blockquote')}
            />
            <ToolbarButton
              icon={Code}
              title="Code"
              onClick={() => handleFormatText('codeBlock')}
            />
            <ToolbarButton
              icon={Link}
              title="Link"
              onClick={() => handleFormatText('createLink')}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ToolbarButton
            icon={viewMode === 'mdi' ? LayoutDashboard : Layout}
            title={viewMode === 'mdi' ? "Switch to Tabbed View" : "Switch to MDI View"}
            onClick={() => onSetView(viewMode === 'mdi' ? 'tabbed' : 'mdi')}
            active={viewMode === 'mdi'}
          />
          {viewMode === 'mdi' && (
            <>
              <ToolbarButton
                icon={Layers}
                title="Cascade Windows"
                onClick={() => onWindowAction('cascade')}
                rotate
              />
              <ToolbarButton
                icon={Grid}
                title="Tile Windows"
                onClick={() => onWindowAction('tile')}
              />
            </>
          )}
          <ToolbarButton
            icon={Eye}
            title={showSource ? "View Rendered" : "View Source"}
            onClick={() => setShowSource(!showSource)}
          />
          <ToolbarButton
            icon={X}
            title="Close All"
            onClick={handleCloseAll}
          />
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showCloseAllDialog}
        onClose={() => setShowCloseAllDialog(false)}
        onConfirm={handleConfirmCloseAll}
        title="Close All"
        message="Are you sure you want to close all open entries? Any unsaved changes will be lost."
        confirmLabel="Close All"
        cancelLabel="Cancel"
        variant="danger"
      />
    </>
  );
};

export default EditorToolbar;