// src/components/sidebar/TagsTab.jsx
import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Tag, X } from 'lucide-react';

const TagsTab = ({ activeDocument, entries, onUpdateEntry }) => {
  const [newTag, setNewTag] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);

  const getAllTags = () => {
    const tags = new Set();
    entries.forEach(entry => {
      entry.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNewTagChange = (e) => {
    const value = e.target.value;
    setNewTag(value);

    if (value.trim()) {
      const allTags = getAllTags();
      const filtered = allTags.filter(tag => 
        tag.toLowerCase().includes(value.toLowerCase()) && 
        !activeDocument?.tags?.includes(tag)
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const addTag = (tag) => {
    if (!activeDocument) return;
    
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;

    const currentTags = activeDocument.tags || [];
    if (!currentTags.includes(trimmedTag)) {
      onUpdateEntry(activeDocument.id, {
        tags: [...currentTags, trimmedTag]
      });
    }

    setNewTag('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove) => {
    if (!activeDocument) return;
    const updatedTags = (activeDocument.tags || []).filter(tag => tag !== tagToRemove);
    onUpdateEntry(activeDocument.id, { tags: updatedTags });
  };

  if (!activeDocument) {
    return (
      <div className="p-4 text-text-muted dark:text-text-muted-dark text-center">
        Select a document to manage tags
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={handleNewTagChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTag.trim()) {
                addTag(newTag);
              }
            }}
            className="flex-1 px-4 py-2 rounded-lg
              bg-primary dark:bg-primary-dark
              border border-border dark:border-border-dark
              focus:ring-1 focus:ring-accent dark:focus:ring-accent-dark
              placeholder:text-text-muted dark:placeholder:text-text-muted-dark
              transition-smooth"
            placeholder="Add new tag..."
          />
          <button
            onClick={() => addTag(newTag)}
            disabled={!newTag.trim()}
            className="px-3 py-2 rounded-lg
              bg-accent dark:bg-accent-dark
              hover:bg-accent-hover dark:hover:bg-accent-hover-dark
              text-white dark:text-text-dark
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-smooth"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-10 w-full mt-1 
              bg-primary dark:bg-primary-dark
              border border-border dark:border-border-dark
              rounded-lg shadow-lg max-h-48 overflow-auto"
          >
            {suggestions.map((suggestion) => (
              <div
                key={suggestion}
                className="px-4 py-2 flex items-center gap-2
                  hover:bg-secondary dark:hover:bg-secondary-dark
                  cursor-pointer transition-smooth"
                onClick={() => addTag(suggestion)}
              >
                <Tag className="w-4 h-4" />
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {activeDocument.tags?.map(tag => (
          <div
            key={tag}
            className="flex items-center justify-between px-3 py-2 
              bg-accent/10 dark:bg-accent-dark/10
              rounded-lg border border-transparent dark:border-border-dark"
          >
            <span className="flex items-center gap-2 text-accent dark:text-text-dark">
              <Tag className="w-4 h-4" />
              {tag}
            </span>
            <button
              onClick={() => removeTag(tag)}
              className="p-1 rounded-full
                hover:bg-accent/20 dark:hover:bg-accent-dark/20
                text-accent dark:text-text-dark
                transition-smooth"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TagsTab;