import React, { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import RichTextEditor from '../editor/RichTextEditor';

const MobileEditor = ({ entry, onSave, onClose }) => {
  const [content, setContent] = useState(entry.content || '');
  const [title, setTitle] = useState(entry.title || '');

  const handleSave = () => {
    onSave({
      ...entry,
      title,
      content
    });
    onClose();
  };

  return (
    <div className="h-screen flex flex-col bg-primary dark:bg-primary-dark">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-secondary dark:bg-secondary-dark">
        <button
          onClick={onClose}
          className="text-lg p-2 rounded-lg hover:bg-primary dark:hover:bg-primary-dark"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onClick={handleSave}
          className="text-lg p-2 rounded-lg bg-accent dark:bg-accent-dark text-white"
        >
          <Save className="w-6 h-6" />
        </button>
      </div>

      {/* Title Input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Entry title..."
        className="text-xl p-4 bg-primary dark:bg-primary-dark text-content dark:text-content-dark focus:outline-none"
      />

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <RichTextEditor
          content={content}
          onChange={setContent}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default MobileEditor;
