// src/components/MainContent.jsx
import React from 'react';
import MDIWindowManager from './mdi/MDIWindowManager';
import TabbedView from './tabbed/TabbedView';
import EditorToolbar from './editor/EditorToolbar';

const MainContent = ({
  viewMode = 'mdi',
  setViewMode,
  entries,
  onNewEntry,
  onNewWriting,
  onCloseEntry,
  onCloseAll,
  onUpdateEntry,
  mdiViewRef,
  editorRef,
  showSource,
  setShowSource,
}) => {
  const entriesArray = Array.from(entries.values());
  
  const handleWindowAction = (action) => {
    if (viewMode === 'mdi' && mdiViewRef.current) {
      if (action === 'cascade') {
        mdiViewRef.current.cascadeWindows();
      } else if (action === 'tile') {
        mdiViewRef.current.tileWindows();
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-none border-b border-border dark:border-border-dark">
        <EditorToolbar
          onNewEntry={onNewEntry}
          onNewWriting={onNewWriting}
          onCloseAll={onCloseAll}
          editorRef={editorRef}
          showSource={showSource}
          setShowSource={setShowSource}
          onSetView={setViewMode}
          viewMode={viewMode}
          onWindowAction={handleWindowAction}
        />
      </div>
      <div className="flex-1 min-h-0">
        {viewMode === 'mdi' ? (
          <MDIWindowManager
            ref={mdiViewRef}
            editorRef={editorRef}
            entries={entriesArray}
            onUpdateEntry={onUpdateEntry}
            onCloseEntry={onCloseEntry}
            showSource={showSource}
          />
        ) : (
          <TabbedView
            entries={entries}
            onUpdateEntry={onUpdateEntry}
            onCloseEntry={onCloseEntry}
            editorRef={editorRef}
            showSource={showSource}
          />
        )}
      </div>
    </div>
  );
};

export default MainContent;