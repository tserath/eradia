import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { marked } from 'marked';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import Typo from 'typo-js';
import { useAppearance } from '../theme/AppearanceContext';
import TurndownService from 'turndown';

const RichTextEditor = forwardRef(({ content = '', onChange = () => {}, showSource = false }, ref) => {
  const sourceRef = useRef(null);
  const editorRef = useRef(null);
  const lastExternalContent = useRef(content);
  const isInternalChange = useRef(false);
  const localContentRef = useRef(content);
  const { documentFont, documentFontSize } = useAppearance();
  const [dictionary, setDictionary] = useState(null);
  const [dictionaryData, setDictionaryData] = useState(null);

  // Initialize turndown service using useMemo
  const turndownService = useMemo(() => new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  }), []);

  // Load dictionary data
  useEffect(() => {
    const loadDictionary = async () => {
      try {
        console.log('Loading dictionary files...');
        // Load aff and dic files
        const [affData, dicData] = await Promise.all([
          fetch('/dictionaries/en_US/index.aff').then(r => r.text()),
          fetch('/dictionaries/en_US/index.dic').then(r => r.text())
        ]);
        console.log('Dictionary files loaded', { affDataLength: affData.length, dicDataLength: dicData.length });

        // Initialize Typo dictionary first
        const dict = new Typo('en_US', affData, dicData);
        console.log('Typo dictionary initialized', { hasWords: !!dict.words, hasDictionaryData: !!dict });
        
        // Ensure the dictionary has a words object
        if (!dict.words) {
          dict.words = {};
        }

        // Now load custom dictionary
        console.log('Loading custom dictionary...');
        const customResponse = await fetch('/api/dictionary/custom', {
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'include'
        });

        if (!customResponse.ok) {
          throw new Error('Failed to load custom dictionary');
        }
        
        const customWords = await customResponse.json();
        console.log('Custom dictionary loaded', { wordCount: customWords?.length });
        
        // Add custom words to dictionary
        if (Array.isArray(customWords)) {
          customWords.forEach(word => {
            if (typeof word === 'string') {
              dict.words[word.toLowerCase()] = word;
            }
          });
          setDictionaryData(customWords);
        }
        
        setDictionary(dict);
        console.log('Dictionary setup complete');
        
      } catch (error) {
        console.error('Error loading dictionary:', error);
      }
    };

    loadDictionary();
  }, []);

  // Create spellcheck plugin
  const spellcheckPlugin = useMemo(() => {
    if (!dictionary) return null;

    return new Plugin({
      key: new PluginKey('spellcheck'),
      props: {
        decorations: (state) => {
          const { doc } = state;
          const decorations = [];

          doc.descendants((node, pos) => {
            if (node.isText) {
              const text = node.text;
              const words = text.match(/\b\w+\b/g);
              if (!words) return;

              let currentIndex = 0;
              words.forEach(word => {
                const start = text.indexOf(word, currentIndex);
                if (start === -1) return;
                
                const end = start + word.length;
                currentIndex = end;

                const isKnown = dictionary.check?.(word) || 
                              (dictionary.words?.[word.toLowerCase()]) ||
                              (dictionaryData?.some(customWord => 
                                customWord.toLowerCase() === word.toLowerCase()
                              ));

                if (!isKnown) {
                  decorations.push(
                    Decoration.inline(pos + start, pos + end, {
                      class: 'misspelled'
                    })
                  );
                }
              });
            }
          });

          return DecorationSet.create(doc, decorations);
        }
      }
    });
  }, [dictionary, dictionaryData]);

  // Save word to custom dictionary
  const addWordToDictionary = useCallback(async (word) => {
    if (!word || !dictionary) return;

    try {
      const response = await fetch('/api/dictionary/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({ word }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add word: ${response.status}`);
      }

      const updatedDictionary = await response.json();
      
      // Add to dictionary's personal word list
      if (dictionary.words) {
        dictionary.words[word.toLowerCase()] = word;
      }
      
      // Update dictionary data state
      if (Array.isArray(updatedDictionary)) {
        setDictionaryData(updatedDictionary);
      }

      // Force a re-render of the editor to update spellcheck decorations
      if (editor) {
        editor.view.dispatch(editor.state.tr);
      }
      
    } catch (error) {
      console.error('Error adding word to dictionary:', error);
      throw error;
    }
  }, [dictionary]);

  const handleContextMenu = useCallback((event, view) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Remove any existing context menus
    const existingMenus = document.querySelectorAll('.editor-context-menu');
    existingMenus.forEach(menu => menu.remove());
    
    // Get cursor position
    const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
    if (!pos?.pos) return true;

    // Get the text content
    const doc = view.state.doc;
    const $pos = doc.resolve(pos.pos);
    const node = $pos.parent;

    if (!node || !node.isBlock) return true;

    // Get the text content of this block
    const blockStart = $pos.start();
    const blockEnd = $pos.end();
    const blockText = doc.textBetween(blockStart, blockEnd, "\n", "\n");
    
    // Calculate offset within this block
    const localPos = pos.pos - blockStart;

    // Find word boundaries
    let wordStart = localPos;
    let wordEnd = localPos;

    // Move backward until we hit a word boundary
    while (wordStart > 0 && /[\w'\-]/.test(blockText[wordStart - 1])) {
      wordStart--;
    }

    // Move forward until we hit a word boundary
    while (wordEnd < blockText.length && /[\w'\-]/.test(blockText[wordEnd])) {
      wordEnd++;
    }

    // Get the selected word
    const selectedWord = blockText.slice(wordStart, wordEnd);

    // Only proceed if we have a valid word
    if (!selectedWord || !/^[\w'\-]+$/.test(selectedWord)) {
      return true;
    }

    // Calculate global positions
    const globalStart = blockStart + wordStart;
    const globalEnd = blockStart + wordEnd;

    // Create context menu
    const contextMenu = document.createElement('div');
    contextMenu.className = 'editor-context-menu fixed z-[9999] min-w-[200px] py-2 bg-primary dark:bg-primary-dark rounded-lg shadow-lg border border-border dark:border-border-dark';
    
    // Position menu
    const x = Math.min(event.clientX, window.innerWidth - 200);
    const y = Math.min(event.clientY, window.innerHeight - 200);
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.style.position = 'fixed';

    const createMenuItem = (label, action) => {
      const item = document.createElement('button');
      item.className = 'w-full text-left px-2 py-1 hover:bg-background-light dark:hover:bg-background-dark-light';
      item.textContent = label;
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        action();
        contextMenu.remove();
      });
      return item;
    };

    // Add spell check items only if we have a valid word
    if (dictionary) {
      const wordLower = selectedWord.toLowerCase();
      
      // Check dictionaries
      const isInBuiltInDictionary = dictionary?.words?.[wordLower] || (dictionary?.check?.(wordLower) ?? false);
      const isInCustomDictionary = Array.isArray(dictionaryData) && 
        dictionaryData.some(word => word.toLowerCase() === wordLower);
      
      const isWordKnown = isInBuiltInDictionary || isInCustomDictionary;

      if (!isWordKnown) {
        const suggestions = dictionary.suggest?.(selectedWord)
          ?.filter(suggestion => 
            /^[a-zA-Z'\-]+$/.test(suggestion) && 
            Math.abs(suggestion.length - selectedWord.length) <= 3
          )
          ?.slice(0, 5) || [];
        
        if (suggestions.length > 0) {
          suggestions.forEach(suggestion => {
            contextMenu.appendChild(createMenuItem(suggestion, () => {
              const tr = view.state.tr.replaceWith(
                globalStart,
                globalEnd,
                view.state.schema.text(suggestion)
              );
              view.dispatch(tr);
            }));
          });
          
          const divider = document.createElement('div');
          divider.className = 'border-t border-border dark:border-border-dark my-2';
          contextMenu.appendChild(divider);
        }

        contextMenu.appendChild(createMenuItem('Add to Dictionary', async () => {
          try {
            await addWordToDictionary(selectedWord);
            view.dispatch(view.state.tr);
          } catch (err) {
            console.error('Failed to add word:', err);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
            errorDiv.textContent = 'Failed to add word to dictionary';
            document.body.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 3000);
          }
        }));

        const divider = document.createElement('div');
        divider.className = 'border-t border-border dark:border-border-dark my-2';
        contextMenu.appendChild(divider);
      }
    }

    // Standard menu items
    contextMenu.appendChild(createMenuItem('Cut', () => document.execCommand('cut')));
    contextMenu.appendChild(createMenuItem('Copy', () => document.execCommand('copy')));
    contextMenu.appendChild(createMenuItem('Paste', () => document.execCommand('paste')));
    contextMenu.appendChild(createMenuItem('Paste without formatting', () => {
      const clipboardData = event.clipboardData || window.clipboardData;
      if (clipboardData) {
        const text = clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
      }
    }));

    document.body.appendChild(contextMenu);

    const removeMenu = (e) => {
      if (!contextMenu.contains(e.target)) {
        contextMenu.remove();
        document.removeEventListener('mousedown', removeMenu);
      }
    };
    document.addEventListener('mousedown', removeMenu);

    return true;
  }, [dictionary, dictionaryData, addWordToDictionary]);

  const editorProps = useMemo(() => ({
    handleDOMEvents: {
      contextmenu: (view, event) => handleContextMenu(event, view)
    }
  }), [handleContextMenu]);

  // Create editor with spellcheck plugin
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        },
        bulletList: true,
        orderedList: true,
        blockquote: true,
        codeBlock: true
      }),
      Image,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer',
          rel: 'noopener noreferrer nofollow'
        },
        protocols: ['http', 'https', 'mailto', 'tel']
      }),
      Placeholder.configure({
        placeholder: 'Start writing...'
      })
    ],
    content: content ? marked.parse(content) : '',
    editorProps: {
      attributes: {
        class: 'outline-none min-h-full',
        spellcheck: 'false'
      },
      handleDOMEvents: {
        contextmenu: handleContextMenu,
        click: (view, event) => {
          // Handle ctrl/cmd + click on links
          const link = event.target.closest('a');
          if (link && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            window.open(link.href, '_blank');
          }
        }
      },
      ...editorProps
    },
    onUpdate: ({ editor }) => {
      if (!isInternalChange.current) {
        isInternalChange.current = true;
        // Convert HTML to markdown before saving
        const html = editor.getHTML();
        const markdown = turndownService.turndown(html);
        onChange(markdown);
        isInternalChange.current = false;
      }
    }
  });

  // Add spellcheck plugin when dictionary is loaded
  useEffect(() => {
    if (editor && spellcheckPlugin) {
      editor.registerPlugin(spellcheckPlugin);
      return () => {
        editor.unregisterPlugin(spellcheckPlugin.key);
      };
    }
  }, [editor, spellcheckPlugin]);

  // Update editor font and size when appearance changes
  useEffect(() => {
    if (editor?.view?.dom && editor.view.docView) {
      const size = parseInt(documentFontSize);
      editor.view.dom.style.fontSize = `${size}px`;
      editor.view.dom.style.fontFamily = documentFont;
    }
  }, [editor?.view?.dom, documentFont, documentFontSize]);

  const handleSourceChange = (e) => {
    onChange(e.target.value);
  };

  useImperativeHandle(ref, () => ({
    getContent: () => localContentRef.current,
    setContent: (content) => {
      if (editor) {
        editor.commands.setContent(content);
      }
    },
    focus: () => {
      if (editor) {
        editor.commands.focus();
      }
    },
    execCommand: (command, ...args) => {
      if (!editor) return;

      try {
        switch (command) {
          case 'bold':
            editor.chain().focus().toggleBold().run();
            break;
          case 'italic':
            editor.chain().focus().toggleItalic().run();
            break;
          case 'underline':
            editor.chain().focus().toggleUnderline().run();
            break;
          case 'strikethrough':
            editor.chain().focus().toggleStrike().run();
            break;
          case 'justifyLeft':
            editor.chain().focus().setTextAlign('left').run();
            break;
          case 'justifyCenter':
            editor.chain().focus().setTextAlign('center').run();
            break;
          case 'justifyRight':
            editor.chain().focus().setTextAlign('right').run();
            break;
          case 'heading1':
            editor.chain().focus().toggleHeading({ level: 1 }).run();
            break;
          case 'heading2':
            editor.chain().focus().toggleHeading({ level: 2 }).run();
            break;
          case 'heading3':
            editor.chain().focus().toggleHeading({ level: 3 }).run();
            break;
          case 'bulletList':
            editor.chain().focus().toggleBulletList().run();
            break;
          case 'orderedList':
            editor.chain().focus().toggleOrderedList().run();
            break;
          case 'blockquote':
            editor.chain().focus().toggleBlockquote().run();
            break;
          case 'codeBlock':
            editor.chain().focus().toggleCodeBlock().run();
            break;
          case 'createLink':
            const url = args[0] || '';
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            } else {
              editor.chain().focus().unsetLink().run();
            }
            break;
          default:
            console.error('Unknown command:', command);
        }
      } catch (err) {
        console.error('Error executing command:', command, err);
      }
    }
  }));

  if (showSource) {
    return (
      <textarea
        ref={sourceRef}
        className="w-full h-full p-4 bg-primary dark:bg-primary-dark text-text dark:text-text-dark font-mono"
        value={content}
        onChange={handleSourceChange}
        spellCheck="false"
        lang="en"
        style={{ 
          fontFamily: documentFont,
          fontSize: parseInt(documentFontSize) + 'px'
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col" key="editor-container">
      <EditorContent 
        ref={editorRef}
        editor={editor}
        className="prose dark:prose-invert max-w-none flex-1 min-h-0 overflow-y-auto"
      />
      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 100%;
          padding: 1rem;
          background-color: var(--color-primary);
          color: var(--color-text);
          font-family: ${documentFont};
          font-size: ${parseInt(documentFontSize)}px !important;
          -webkit-user-modify: read-write;
          user-modify: read-write;
          -webkit-line-break: after-white-space;
        }
        .ProseMirror > * {
          margin-left: auto;
          margin-right: auto;
          max-width: 65ch;
          min-width: 0;
          width: 100%;
        }
        .ProseMirror p {
          margin: 0.5em 0;
        }
        .ProseMirror:focus {
          outline: none;
        }
        .ProseMirror > :last-child {
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
});

export default RichTextEditor;