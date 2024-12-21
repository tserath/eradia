// backend/src/index.js
import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const port = 3000;

const CONFIG_DIR = '/config';
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const JOURNAL_DIR = '/data/journal';
const DATA_DIR = '/data';

const WRITINGS_DIR = path.join(DATA_DIR, 'writings');

app.use(cors());
app.use(express.json());

// Add root route
app.get('/', (req, res) => {
  res.json({ message: 'Eradia Journal API is running' });
});

function getJournalPath(date) {
 const year = date.getFullYear();
 const month = (date.getMonth() + 1).toString().padStart(2, '0');
 return path.join(JOURNAL_DIR, year.toString(), month);
}

async function getNextFileNumber(dirPath) {
  try {
    // Get the day number from the path
    const day = path.basename(dirPath).padStart(2, '0');
    
    // Get all files in the month directory
    const monthDir = path.dirname(dirPath);
    const files = await fs.readdir(monthDir);
    
    // Find all numbers for the current day
    const numbers = [];
    const dayPattern = new RegExp(`^${day}-(\\d{3})\\.json$`);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const match = dayPattern.exec(file);
      if (match) {
        numbers.push(parseInt(match[1], 10));
      }
    }
    
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    return (maxNumber + 1).toString().padStart(3, '0');
  } catch {
    return '001';
  }
}

async function ensureDir(dirPath) {
 try {
   await fs.access(dirPath);
 } catch {
   await fs.mkdir(dirPath, { recursive: true });
 }
}

async function ensureConfig() {
 await ensureDir(CONFIG_DIR);
 try {
   await fs.access(CONFIG_FILE);
 } catch {
   await fs.writeFile(CONFIG_FILE, JSON.stringify({ openWindows: {} }, null, 2));
 }
}

app.get('/api/config', async (req, res) => {
 try {
   await ensureConfig();
   const content = await fs.readFile(CONFIG_FILE, 'utf-8');
   res.json(JSON.parse(content));
 } catch (error) {
   console.error('Error loading config:', error);
   res.json({ openWindows: {} }); // Return default instead of error
 }
});

app.post('/api/config', async (req, res) => {
 try {
   await ensureConfig();
   const config = req.body;
   await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
   res.json(config);
 } catch (error) {
   console.error('Error saving config:', error);
   res.status(500).json({ error: error.message });
 }
});

// Helper function to read a file and its metadata
async function readFileAndMetadata(filePath, type) {
  try {
    // Read the metadata file
    const metadataPath = filePath.replace('.md', '.json');
    const content = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(content);
    
    // Read the markdown content
    let mdContent = '';
    try {
      mdContent = await fs.readFile(filePath, 'utf-8');
    } catch (e) {
      console.warn(`No .md file found for ${filePath}`);
    }

    return {
      ...metadata,
      content: mdContent,
      type
    };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

app.get('/api/entries', async (req, res) => {
  try {
    const entries = [];
    
    // Recursively walk through the journal directory
    async function walkDir(dir) {
      // Only process if we're in JOURNAL_DIR or a subdirectory of it
      if (!dir.startsWith(JOURNAL_DIR)) {
        return;
      }

      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          await walkDir(filePath);
        } else if (file.endsWith('.md')) {
          const entry = await readFileAndMetadata(filePath, 'journal');
          if (entry && entry.type === 'journal') { 
            entries.push([entry.id, entry]);
          }
        }
      }
    }
    
    await walkDir(JOURNAL_DIR);
    res.json(entries);
  } catch (error) {
    console.error('Error loading all entries:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/entries/:date', async (req, res) => {
 try {
   const date = new Date(req.params.date);
   const dirPath = getJournalPath(date);
   const day = date.getDate().toString().padStart(2, '0');

   await ensureDir(dirPath);

   const files = await fs.readdir(dirPath);
   const dayFiles = files.filter(f => f.startsWith(`${day}-`));

   const entries = [];
   for (const file of dayFiles) {
     if (!file.endsWith('.json')) continue;

     const metadataPath = path.join(dirPath, file);
     const mdPath = metadataPath.replace('.json', '.md');
     
     try {
       const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
       let content = '';
       try {
         content = await fs.readFile(mdPath, 'utf-8');
       } catch (e) {
         console.warn(`No .md file found for ${file}`);
       }
       
       entries.push([
         metadata.id,
         {
           ...metadata,
           content
         }
       ]);
     } catch (error) {
       console.error(`Error reading files for ${file}:`, error);
     }
   }
   
   res.json(entries);
 } catch (error) {
   console.error('Error loading entries:', error);
   res.status(500).json({ error: error.message });
 }
});

// Rename entry endpoint
app.post('/api/entries/rename', async (req, res) => {
  try {
    const { id, newTitle } = req.body;
    if (!id || !newTitle) {
      return res.status(400).json({ error: 'ID and new title are required' });
    }

    // Find the entry files
    let found = false;
    const walkAndRename = async (dir) => {
      const items = await fs.readdir(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item.name);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          await walkAndRename(itemPath);
        } else if (item.isFile() && item.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(itemPath, 'utf8');
            const metadata = JSON.parse(content);
            if (metadata.id === id) {
              // Found the entry, update its title
              metadata.title = newTitle;
              metadata.modified = new Date().toISOString();
              await writeFileWithRetry(itemPath, JSON.stringify(metadata, null, 2));
              found = true;
              break;
            }
          } catch (error) {
            console.warn(`Error processing ${itemPath}:`, error);
          }
        }
      }
    };

    await walkAndRename(JOURNAL_DIR);

    if (!found) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error renaming entry:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entry = req.body;

    if (!entry || !entry.content) {
      return res.status(400).json({ error: 'Entry content is required' });
    }

    const date = new Date(entry.created);
    const dirPath = getJournalPath(date);
    const day = date.getDate().toString().padStart(2, '0');

    await ensureDir(dirPath);

    const files = await fs.readdir(dirPath);
    let existingFile = null;
    for (const file of files) {
      if (file.endsWith('.json')) {
        const metadataPath = path.join(dirPath, file);
        try {
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
          if (metadata.id === id) {
            existingFile = file.replace('.json', '');
            break;
          }
        } catch (e) {
          // Ignore metadata read errors
        }
      }
    }

    const filename = existingFile || `${day}-${await getNextFileNumber(dirPath)}`;
    const mdFilePath = path.join(dirPath, `${filename}.md`);
    const metadataPath = path.join(dirPath, `${filename}.json`);

    await fs.writeFile(mdFilePath, entry.content);

    // Verify write
    await fs.readFile(mdFilePath, 'utf-8');

    const metadata = {
      id,
      title: entry.title,
      created: entry.created,
      modified: new Date().toISOString(),
      tags: entry.tags || [],
      filename
    };
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    res.json({ ...entry, content: entry.content, filename });
  } catch (error) {
    console.error('Error saving entry:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let entryFound = false;
    async function findAndDeleteEntry(dir) {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          await findAndDeleteEntry(filePath);
        } else if (file.endsWith('.json')) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const metadata = JSON.parse(content);
            
            if (metadata.id === id) {
              const mdPath = filePath.replace('.json', '.md');
              await Promise.all([
                fs.unlink(filePath).catch(() => {}),
                fs.unlink(mdPath).catch(() => {})
              ]);
              entryFound = true;
              break;
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      }
    }
    
    await findAndDeleteEntry(JOURNAL_DIR);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function for atomic file writes
async function writeFileAtomic(filePath, content) {
  const tempPath = `${filePath}.tmp`;
  const dirPath = path.dirname(filePath);

  try {
    // First ensure the directory exists with proper permissions
    await fs.mkdir(dirPath, { recursive: true, mode: 0o755 });
    
    // Write to temp file with proper permissions
    await fs.writeFile(tempPath, content, { mode: 0o644, encoding: 'utf-8' });
    
    try {
      // Try to rename (atomic operation)
      await fs.rename(tempPath, filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // If directory doesn't exist (can happen in race conditions), try to create it again
        await fs.mkdir(dirPath, { recursive: true, mode: 0o755 });
        await fs.rename(tempPath, filePath);
      } else if (error.code === 'EEXIST') {
        // If target exists and rename fails, try to unlink first
        await fs.unlink(filePath);
        await fs.rename(tempPath, filePath);
      } else {
        throw error;
      }
    }
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore error if temp file doesn't exist
    }
    throw error;
  }
}

// Helper function for retries with atomic writes
async function writeFileWithRetry(filePath, content, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await writeFileAtomic(filePath, content);
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
    }
  }
}

// Helper function to check if an entry matches the search
function entryMatches(entry, searchTerm, type) {
  if (type === 'tags' && entry.tags) {
    return entry.tags.some(tag => tag.toLowerCase().includes(searchTerm));
  }
  return (
    entry.content?.toLowerCase().includes(searchTerm) ||
    entry.title?.toLowerCase().includes(searchTerm)
  );
}

// Search endpoint that can search both directories
app.get('/api/search', async (req, res) => {
  try {
    const { query, type = 'all' } = req.query;
    if (!query) {
      return res.json([]);
    }

    const results = [];
    const searchTerm = query.toLowerCase();

    // Search journal entries
    if (type === 'all' || type === 'journal' || type === 'tags') {
      async function walkJournal(dir) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = await fs.stat(filePath);
          
          if (stat.isDirectory()) {
            await walkJournal(filePath);
          } else if (file.endsWith('.md')) {
            const entry = await readFileAndMetadata(filePath, 'journal');
            if (entry && entry.type === 'journal' && entryMatches(entry, searchTerm, type)) {
              results.push(entry);
            }
          }
        }
      }
      await walkJournal(JOURNAL_DIR);
    }

    // Search writings
    if (type === 'all' || type === 'writings' || type === 'tags') {
      async function walkWritings(dir) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = await fs.stat(filePath);
          
          if (stat.isDirectory()) {
            await walkWritings(filePath);
          } else if (file.endsWith('.md')) {
            const entry = await readFileAndMetadata(filePath, 'writing');
            if (entry && entry.type === 'writing' && entryMatches(entry, searchTerm, type)) {
              results.push(entry);
            }
          }
        }
      }
      await walkWritings(WRITINGS_DIR);
    }

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Writings endpoints
app.get('/api/writings', async (req, res) => {
  try {
    await ensureDir(WRITINGS_DIR);
    
    // Create a tree structure
    const root = {
      name: 'root',
      type: 'directory',
      children: []
    };

    const addToTree = (pathParts, fileInfo) => {
      let current = root;
      
      // Create path structure
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        let child = current.children.find(c => c.name === part);
        
        if (!child) {
          child = {
            name: part,
            type: 'directory',
            children: []
          };
          current.children.push(child);
        }
        
        current = child;
      }
      
      // Add the file
      current.children.push({
        name: pathParts[pathParts.length - 1],
        type: 'file',
        ...fileInfo
      });
    };

    const walkWritings = async (dir) => {
      const items = await fs.readdir(dir, { withFileTypes: true });
      for (const item of items) {
        try {
          const itemPath = path.join(dir, item.name);
          const relativePath = path.relative(WRITINGS_DIR, itemPath);
          const pathParts = relativePath.split(path.sep);
          
          if (item.isDirectory()) {
            // Add directory to tree first
            let current = root;
            for (const part of pathParts) {
              let child = current.children.find(c => c.name === part);
              if (!child) {
                child = {
                  name: part,
                  type: 'directory',
                  children: []
                };
                current.children.push(child);
              }
              current = child;
            }
            // Then recursively walk its contents
            await walkWritings(itemPath);
          } else if (item.isFile() && item.name.endsWith('.md')) {
            try {
              const stats = await fs.stat(itemPath);
              addToTree(pathParts, {
                path: relativePath,
                modified: stats.mtime
              });
            } catch (error) {
              // Skip files that no longer exist or can't be accessed
              console.warn(`Skipping inaccessible file ${itemPath}:`, error.message);
              continue;
            }
          }
        } catch (error) {
          // Skip items that cause errors
          console.warn(`Error processing item ${item.name}:`, error.message);
          continue;
        }
      }
    };

    await walkWritings(WRITINGS_DIR);
    res.json(root);
  } catch (error) {
    console.error('Error loading writings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/writings/content', async (req, res) => {
  try {
    // Clean and normalize the path
    const cleanPath = req.query.path
      .replace(/^root\//, '')  // Remove root/ prefix if present
      .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
      .replace(/\.md$/, '')    // Remove .md extension if present
      + '.md';                 // Add .md extension back

    const filePath = path.join(WRITINGS_DIR, cleanPath);
    const normalizedPath = path.normalize(filePath);

    // Ensure the requested path is within WRITINGS_DIR
    if (!normalizedPath.startsWith(WRITINGS_DIR)) {
      return res.status(403).json({ error: 'Invalid path' });
    }

    // Try to read the file
    try {
      const content = await fs.readFile(normalizedPath, 'utf-8');
      res.json({ content });
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Try without .md extension as fallback
        const altPath = normalizedPath.replace(/\.md$/, '');
        try {
          const content = await fs.readFile(altPath, 'utf-8');
          res.json({ content });
        } catch (innerError) {
          console.error('Error loading writing content:', error);
          res.status(404).json({ error: 'File not found' });
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error loading writing content:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/writings/move', async (req, res) => {
  try {
    const { oldPath, newPath, overwrite = false } = req.body;
    console.log('Move request received:', { oldPath, newPath, overwrite });

    if (!oldPath || !newPath) {
      return res.status(400).json({ error: 'Both old and new paths are required' });
    }

    // Normalize paths and create full paths - ensure no leading/trailing slashes
    const cleanOldPath = oldPath.replace(/^\/+|\/+$/g, '').replace(/\.md$/, '');
    const cleanNewPath = newPath.replace(/^\/+|\/+$/g, '').replace(/\.md$/, '');
    const oldFullPath = path.join(WRITINGS_DIR, cleanOldPath);
    const newFullPath = path.join(WRITINGS_DIR, cleanNewPath);

    // Security check: ensure paths are within WRITINGS_DIR
    const normalizedOldPath = path.normalize(oldFullPath);
    const normalizedNewPath = path.normalize(newFullPath);
    if (!normalizedOldPath.startsWith(WRITINGS_DIR) || !normalizedNewPath.startsWith(WRITINGS_DIR)) {
      return res.status(403).json({ error: 'Invalid path' });
    }

    try {
      // First check if the source exists as a directory
      const stats = await fs.stat(oldFullPath);
      if (stats.isDirectory()) {
        // Handle directory move
        try {
          await fs.access(newFullPath);
          if (!overwrite) {
            return res.status(409).json({ error: 'Destination already exists', code: 'FILE_EXISTS' });
          }
          // If overwriting, remove the destination
          await fs.rm(newFullPath, { recursive: true, force: true });
        } catch (error) {
          // Destination doesn't exist, which is fine
        }

        // Create parent directory if it doesn't exist
        await fs.mkdir(path.dirname(newFullPath), { recursive: true });

        // Move the directory
        await fs.rename(oldFullPath, newFullPath);
        console.log('Directory move completed successfully');
        return res.json({ success: true });
      }
    } catch (error) {
      // Not a directory or doesn't exist, continue to file handling
    }

    // Try all possible source file combinations
    const oldPaths = [
      `${oldFullPath}.md`,
      oldFullPath,
      oldFullPath.endsWith('.md') ? oldFullPath.slice(0, -3) : null
    ].filter(Boolean);

    let sourceFound = false;
    let actualOldPath;

    for (const testPath of oldPaths) {
      try {
        const stats = await fs.stat(testPath);
        if (stats.isFile()) {
          actualOldPath = testPath;
          sourceFound = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!sourceFound) {
      console.error('Source not found. Tried paths:', oldPaths);
      return res.status(404).json({ error: 'Source not found' });
    }

    // Now we have the correct source path, set up the destination path
    const newMdPath = `${newFullPath}.md`;
    const oldJsonPath = actualOldPath.replace(/\.md$/, '.json');
    const newJsonPath = newMdPath.replace(/\.md$/, '.json');
    const oldBackupPath = `${actualOldPath}.backup`;
    const newBackupPath = `${newMdPath}.backup`;

    // Check if destination exists
    try {
      await fs.access(newMdPath);
      if (!overwrite) {
        return res.status(409).json({ error: 'Destination file already exists', code: 'FILE_EXISTS' });
      }
      // If overwriting, remove all destination files
      await fs.unlink(newMdPath).catch(() => {});
      await fs.unlink(newJsonPath).catch(() => {});
      await fs.unlink(newBackupPath).catch(() => {});
      await fs.unlink(newFullPath).catch(() => {}); // Clean up any file without extension
    } catch {
      // Destination doesn't exist, which is fine
    }

    // Create parent directory if needed
    await fs.mkdir(path.dirname(newMdPath), { recursive: true });

    // Move the main file
    await fs.copyFile(actualOldPath, newMdPath);
    await fs.unlink(actualOldPath);

    // Clean up any stray files without extension
    await fs.unlink(oldFullPath).catch(() => {});

    // Handle associated files
    try {
      if (await fs.stat(oldJsonPath).catch(() => null)) {
        await fs.copyFile(oldJsonPath, newJsonPath);
        await fs.unlink(oldJsonPath);
      }
    } catch {}

    try {
      if (await fs.stat(oldBackupPath).catch(() => null)) {
        await fs.copyFile(oldBackupPath, newBackupPath);
        await fs.unlink(oldBackupPath);
      }
    } catch {}

    console.log('Move operation completed successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('Error moving item:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/writings/directory', async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    if (!dirPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const normalizedPath = path.normalize(dirPath).replace(/^\/+/, '');
    const fullPath = path.join(WRITINGS_DIR, normalizedPath);

    // Check if the path is within the writings directory
    if (!fullPath.startsWith(WRITINGS_DIR)) {
      return res.status(403).json({ error: 'Invalid directory path' });
    }

    // Create the directory
    await fs.mkdir(fullPath, { recursive: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/writings/content', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'Path and content are required' });
    }

    // Clean the path and ensure it has .md extension
    const cleanPath = filePath
      .replace(/^[/\\]+/, '')  // Remove leading slashes
      .replace(/\.md$/, '')    // Remove .md extension if present
      + '.md';                 // Add .md extension back

    const absolutePath = path.join(WRITINGS_DIR, cleanPath);
    const normalizedPath = path.normalize(absolutePath);

    // Ensure the requested path is within WRITINGS_DIR
    if (!normalizedPath.startsWith(WRITINGS_DIR)) {
      return res.status(403).json({ error: 'Invalid path' });
    }

    // Create the directory structure if it doesn't exist
    const dirPath = path.dirname(absolutePath);
    await fs.mkdir(dirPath, { recursive: true });

    // Write the content atomically
    await writeFileWithRetry(absolutePath, content);

    // Create metadata file
    const metadataPath = absolutePath.replace(/\.md$/, '.json');
    const metadata = {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      tags: [],
      title: path.basename(cleanPath, '.md')
    };
    
    await writeFileWithRetry(metadataPath, JSON.stringify(metadata, null, 2));

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving writing content:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/writings/new', async (req, res) => {
  try {
    let { name = 'untitled' } = req.body;
    let suffix = '';
    let counter = 1;
    
    // Keep trying until we find an available filename
    while (true) {
      const tryName = `${name}${suffix}.md`;
      const filePath = path.join(WRITINGS_DIR, tryName);
      const metadataPath = filePath.replace('.md', '.json');
      
      try {
        // Check if file exists
        await fs.access(filePath);
        // File exists, try next number
        suffix = `_${counter}`;
        counter++;
      } catch {
        // File doesn't exist, we can use this name
        // Create empty markdown file
        await fs.writeFile(filePath, '', 'utf-8');
        
        // Create metadata file
        const metadata = {
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          tags: [],
          title: name + suffix
        };
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
        
        // Return the path relative to WRITINGS_DIR
        const relativePath = path.relative(WRITINGS_DIR, filePath);
        
        res.json({ 
          path: relativePath,
          title: name + suffix,
          content: '',
          metadata
        });
        return;
      }
    }
  } catch (error) {
    console.error('Error creating new writing:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/writings', async (req, res) => {
  try {
    const { path: itemPath } = req.query;
    if (!itemPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const absolutePath = path.join(WRITINGS_DIR, itemPath);
    
    // Ensure the path doesn't try to escape the writings directory
    const normalizedPath = path.normalize(absolutePath);
    if (!normalizedPath.startsWith(WRITINGS_DIR)) {
      return res.status(403).json({ error: 'Invalid path' });
    }

    // Check if path exists
    try {
      await fs.access(normalizedPath);
    } catch {
      return res.status(404).json({ error: 'Path not found' });
    }

    // Get stats to determine if it's a file or directory
    const stats = await fs.stat(normalizedPath);
    
    if (stats.isDirectory()) {
      // Recursively remove directory and all contents
      await fs.rm(normalizedPath, { recursive: true });
    } else {
      // Remove single file
      await fs.unlink(normalizedPath);
      
      // Also remove metadata file if it exists
      const metadataPath = normalizedPath.replace('.md', '.json');
      try {
        await fs.unlink(metadataPath);
      } catch {
        // Ignore error if metadata file doesn't exist
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting writing:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/writings/content', async (req, res) => {
  try {
    const requestPath = req.query.path;
    console.log('Delete request for path:', requestPath);

    if (!requestPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    // Join with WRITINGS_DIR and normalize
    const filePath = path.join(WRITINGS_DIR, requestPath);
    const normalizedPath = path.normalize(filePath);
    console.log('Normalized path:', normalizedPath);

    // Ensure the requested path is within WRITINGS_DIR
    if (!normalizedPath.startsWith(WRITINGS_DIR)) {
      console.error('Path traversal attempt:', normalizedPath);
      return res.status(403).json({ error: 'Invalid path' });
    }

    // Determine the paths to delete
    const mdPath = normalizedPath.endsWith('.md') ? normalizedPath : `${normalizedPath}.md`;
    const jsonPath = mdPath.replace('.md', '.json');
    const backupPath = `${mdPath}.backup`;

    // Delete all files, ignoring errors if any don't exist
    await Promise.all([
      fs.unlink(mdPath).catch(() => {}),
      fs.unlink(jsonPath).catch(() => {}),
      fs.unlink(backupPath).catch(() => {})
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error in delete operation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete endpoint that handles path parameters
app.delete('/api/writings/*', async (req, res) => {
  try {
    const itemPath = decodeURIComponent(req.params[0]);
    console.log('Delete request received for path:', itemPath);
    
    if (!itemPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const fullPath = path.join(WRITINGS_DIR, itemPath);
    console.log('Full path:', fullPath);

    // Ensure the path is within the writings directory
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(WRITINGS_DIR)) {
      console.log('Invalid path detected:', { normalizedPath, WRITINGS_DIR });
      return res.status(403).json({ error: 'Invalid path' });
    }

    try {
      const stats = await fs.stat(normalizedPath);
      console.log('File/Directory stats:', {
        isDirectory: stats.isDirectory(),
        size: stats.size,
        path: normalizedPath
      });

      if (stats.isDirectory()) {
        console.log('Deleting directory:', normalizedPath);
        await fs.rm(normalizedPath, { recursive: true, force: true });
      } else {
        console.log('Deleting file:', normalizedPath);
        await fs.unlink(normalizedPath);
      }

      console.log('Delete successful');
      res.json({ success: true });
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Try with .md extension if the file wasn't found
        const mdPath = normalizedPath + '.md';
        console.log('Trying with .md extension:', mdPath);
        try {
          await fs.unlink(mdPath);
          console.log('Delete successful with .md extension');
          res.json({ success: true });
        } catch (mdError) {
          console.error('Error deleting with .md extension:', mdError);
          res.status(404).json({ error: `File or directory not found: ${itemPath}` });
        }
      } else {
        console.error('Error during deletion:', error);
        res.status(500).json({ error: `Failed to delete: ${error.message}` });
      }
    }
  } catch (error) {
    console.error('Error processing delete request:', error);
    res.status(500).json({ error: `Failed to process delete request: ${error.message}` });
  }
});

// Custom dictionary endpoints
app.get('/api/dictionary/custom', async (req, res) => {
  try {
    await ensureDir(CONFIG_DIR);
    const dictionaryPath = path.join(CONFIG_DIR, 'custom-dictionary.json');
    
    try {
      const content = await fs.readFile(dictionaryPath, 'utf-8');
      const words = JSON.parse(content);
      res.json(Array.isArray(words) ? words : []);
    } catch (error) {
      // If file doesn't exist, return empty array
      res.json([]);
    }
  } catch (error) {
    console.error('Error loading custom dictionary:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dictionary/custom', async (req, res) => {
  try {
    const { word } = req.body;
    if (!word) {
      return res.status(400).json({ error: 'Word is required' });
    }

    await ensureDir(CONFIG_DIR);
    const dictionaryPath = path.join(CONFIG_DIR, 'custom-dictionary.json');
    
    let words = [];
    try {
      const content = await fs.readFile(dictionaryPath, 'utf-8');
      words = JSON.parse(content);
      if (!Array.isArray(words)) words = [];
    } catch (error) {
      // If file doesn't exist or is invalid, start with empty array
    }

    // Only add if word isn't already in dictionary
    if (!words.includes(word)) {
      words.push(word);
      await writeFileWithRetry(dictionaryPath, JSON.stringify(words, null, 2));
    }

    res.json({ success: true, words });
  } catch (error) {
    console.error('Error adding word to custom dictionary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Configure logging
process.stdout.write = (function(write) {
  return function(string, encoding, fd) {
    if (string !== '\n') {
      write.call(process.stdout, new Date().toISOString() + ' ');
    }
    write.call(process.stdout, string, encoding, fd);
  };
})(process.stdout.write);

process.stderr.write = (function(write) {
  return function(string, encoding, fd) {
    if (string !== '\n') {
      write.call(process.stderr, new Date().toISOString() + ' [ERROR] ');
    }
    write.call(process.stderr, string, encoding, fd);
  };
})(process.stderr.write);

// Start server
app.listen(3000, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:3000`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});