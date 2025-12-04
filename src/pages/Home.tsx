import React, { useRef, useState, useEffect } from 'react'
import Toolbar from '@/components/Toolbar'
import Sidebar from '@/components/Sidebar'
import EditorShell from '@/modes/EditorShell'
import StatusBar from '@/components/StatusBar'
import SettingsPanel from '@/components/SettingsPanel'
import { useEditorStore } from '@/stores/editorStore'
import { FileState, EditorTab } from '@/types/editor'
import { generateId, getWordCount } from '@/utils/markdown'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { exportMarkdown, exportHTML } from '@/utils/export'

export default function Home() {
  const editorRef = useRef<{ insertSyntax: (syntax: string, placeholder?: string) => void }>(null)
  
  const { 
    config, 
    sidebarVisible, 
    settingsVisible, 
    previewVisible,
    activeFile, 
    setActiveFile, 
    addTab, 
    setEditorState,
    toggleSettings,
    togglePreview,
    setEditorRef 
  } = useEditorStore()
  
  const isDarkTheme = config.theme === 'dark'
  
  // Initialize keyboard shortcuts
  useKeyboardShortcuts()
  
  // Set editor ref in store
  useEffect(() => {
    setEditorRef(editorRef.current)
    return () => setEditorRef(null)
  }, [])
  
  // Initialize with a welcome file
  useEffect(() => {
    if (!activeFile) {
      const welcomeFile: FileState = {
        id: generateId(),
        path: '/welcome.md',
        name: 'welcome.md',
        content: String.raw`# Welcome to Markdown Editor

This is a **modern** markdown editor with *real-time preview*.

## Features

- 📝 **Live editing** with syntax highlighting
- 🎨 **Real-time preview** as you type
- 🌙 **Dark/Light theme** support
- 📁 **File management** with sidebar
- ⚡ **Fast and responsive** interface

---

### Links

Visit [OpenAI](https://openai.com) and edit the link in place.

### Images

![Sample image](https://via.placeholder.com/640x360.png?text=Sample+Image)

If caption below is enabled in settings, the alt text appears centered under the image.

### Code Blocks

\`\`\`javascript
// Syntax highlighting with language hint
function hello(name) {
  console.log(\`Hello, \${name}\`)
}
hello('World')
\`\`\`

### Blockquotes

> Blockquotes look great as well

### Task List (GFM)

- [ ] a
- [x] b

### Mathematics

Inline: $E = mc^2$

Block:

$$
\begin{equation}
\iiint\limits_{0<x,y,z<1} f(x,y,z)
{\mathrm d}x {\mathrm d}y {\mathrm d}z =
\mathcal{F}(x) = \sum_{k=0}^\infty
\oint_0^1 f_k(x,t), \mathrm{d}t
\end{equation}
$$

**Enjoy writing!** 🚀`
.replace(/\\`/g, '`').replace(/\\\$/g, '$'),
        originalContent: '',
        isDirty: false,
        isNewFile: false
      }
      
      setActiveFile(welcomeFile)
      
      const welcomeTab: EditorTab = {
        id: welcomeFile.id,
        name: welcomeFile.name,
        path: welcomeFile.path,
        isActive: true,
        isDirty: false
      }
      
      addTab(welcomeTab)
    }
  }, [])
  
  const handleInsertSyntax = (syntax: string, placeholder?: string) => {
    editorRef.current?.insertSyntax(syntax, placeholder)
  }
  
  const handleNewFile = () => {
    const newFile: FileState = {
      id: generateId(),
      path: `/untitled-${Date.now()}.md`,
      name: 'untitled.md',
      content: '',
      originalContent: '',
      isDirty: false,
      isNewFile: true
    }
    
    setActiveFile(newFile)
    
    const newTab: EditorTab = {
      id: newFile.id,
      name: newFile.name,
      path: newFile.path,
      isActive: true,
      isDirty: false
    }
    
    addTab(newTab)
  }
  
  const handleOpenFile = async () => {
    try {
      // @ts-ignore
      const [fh] = await (window as any).showOpenFilePicker({ types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }] })
      const { readFileWorker } = await import('@/utils/fsWorkerClient')
      const text = await readFileWorker(fh)
      const newFile: FileState = {
        id: generateId(),
        path: fh.name,
        name: fh.name,
        content: text,
        originalContent: text,
        isDirty: false,
        isNewFile: false,
        fileHandle: fh
      }
      setActiveFile(newFile)
      addTab({ id: newFile.id, name: newFile.name, path: newFile.path, isActive: true, isDirty: false })
    } catch {}
  }
  
  const handleSaveFile = async () => {
    if (!activeFile) return
    try {
      const { writeFileWorker } = await import('@/utils/fsWorkerClient')
      if (activeFile.fileHandle) {
        await writeFileWorker(activeFile.fileHandle, activeFile.content)
      } else {
        // @ts-ignore
        const fh = await (window as any).showSaveFilePicker({ suggestedName: activeFile.name, types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }] })
        await writeFileWorker(fh, activeFile.content)
      }
    } catch {}
  }
  
  const handleTogglePreview = () => {
    togglePreview()
  }
  
  const handleExportMarkdown = () => {
    if (activeFile?.content) {
      exportMarkdown(activeFile.content, activeFile.name)
    }
  }
  
  const handleExportHTML = () => {
    if (activeFile?.content) {
      exportHTML(activeFile.content, activeFile.name.replace('.md', '.html'))
    }
  }
  
  return (
    <div 
      className="home"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: isDarkTheme ? '#111827' : '#ffffff'
      }}
    >
      {/* Toolbar */}
      <Toolbar
        onInsertSyntax={handleInsertSyntax}
        onNewFile={handleNewFile}
        onOpenFile={handleOpenFile}
        onSaveFile={handleSaveFile}
        onExportMarkdown={handleExportMarkdown}
        onExportHTML={handleExportHTML}
      />
      
      {/* Main content area */}
      <div 
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden'
        }}
      >
        {/* Sidebar */}
        {sidebarVisible && <Sidebar />}
        
        {/* Editor and Preview */}
        <div 
          style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden'
          }}
        >
          {/* Editor */}
          <div 
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div 
              style={{
                flex: 1,
                padding: '16px',
                overflow: 'auto'
              }}
            >
              <EditorShell />
            </div>
          </div>
          
          {/* Preview disabled in classic mode; reserve for source mode if needed */}
        </div>
      </div>
      
      {/* Status Bar */}
      <StatusBar onTogglePreview={handleTogglePreview} />
      
      {/* Settings Panel */}
      {settingsVisible && (
        <SettingsPanel onClose={toggleSettings} />
      )}
    </div>
  )
}
