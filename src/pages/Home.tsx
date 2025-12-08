import React, { useRef, useEffect } from 'react'
import Toolbar from '@/components/Toolbar'
import Sidebar from '@/components/Sidebar'
import EditorShell from '@/modes/EditorShell'
import StatusBar from '@/components/StatusBar'
import ProgressOverlay from '@/components/ProgressOverlay'
import SettingsPanel from '@/components/SettingsPanel'
import SlidesPreview from '@/components/SlidesPreview'
import { useEditorStore } from '@/stores/editorStore'
import { FileState, EditorTab } from '@/types/editor'
import { generateId } from '@/utils/markdown'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { exportMarkdown, exportHTML, exportReveal } from '@/utils/export'

export default function Home() {
  const editorRef = useRef<{ insertSyntax: (syntax: string, placeholder?: string) => void }>(null)
  
  const { 
    config, 
    sidebarVisible, 
    settingsVisible, 
    activeFile, 
    setActiveFile, 
    addTab, 
    toggleSettings,
    togglePreview,
    setEditorRef 
  } = useEditorStore()
  
  const isDarkTheme = config.theme === 'dark'
  const [slidesPreviewVisible, setSlidesPreviewVisible] = React.useState(false)
  
  // Initialize keyboard shortcuts
  useKeyboardShortcuts()
  
  // Set editor ref in store
  useEffect(() => {
    setEditorRef(editorRef.current)
    return () => setEditorRef(null)
  }, [setEditorRef])
  
  // Initialize with a welcome file
  useEffect(() => {
    if (!activeFile) {
      const welcomeFile: FileState = {
        id: generateId(),
        path: '/welcome.md',
        name: 'welcome.md',
        content: String.raw`# Welcome to Markdown Editor

[TOC]

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

![Sample image](https://cdn.pixabay.com/photo/2025/10/24/16/14/fog-9914605_1280.jpg)

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

Inline: $\int^b_a f(x) \mathrm{d}x = F(b) - F(a)$

Block:

$$
\iiint\limits_{0<x,y,z<1} f(x,y,z)
{\mathrm d}x {\mathrm d}y {\mathrm d}z =
\mathcal{F}(x) = \sum_{k=0}^\infty
\oint_0^1 f_k(x,t), \mathrm{d}t
$$

### Mermaid Graph

Mermaid diagrams are supported. Here's an example:

\`\`\`mermaid
graph TD
A[Start] --> B{Choice}
B -->|Yes| C[Go]
B -->|No| D[Stop]
\`\`\`

### ABC Score

\`\`\`abc
X:1
T:Jazz
M:6/8
L:1/8
K:G
GFG BAB | gfg gab | GFG BAB | d2A AFD |
GFG BAB | gfg gab | age edB |1 dBA AFD :|2 dBA ABd |:
efe edB | dBA ABd | efe edB | gdB ABd |
efe edB | d2d def | gfe edB |1 dBA ABd :|2 dBA AFD |]
\`\`\`

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
  }, [activeFile, addTab, setActiveFile])
  
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
      if (!window.showOpenFilePicker) return
      const [fh] = await window.showOpenFilePicker({ types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }] })
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
    } catch (e) { console.warn(e) }
  }
  
  const handleSaveFile = async () => {
    if (!activeFile) return
    try {
      const { writeFileWorker } = await import('@/utils/fsWorkerClient')
      if (activeFile.fileHandle) {
        await writeFileWorker(activeFile.fileHandle, activeFile.content)
      } else {
        if (!window.showSaveFilePicker) return
        const fh = await window.showSaveFilePicker({ suggestedName: activeFile.name, types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }] })
        await writeFileWorker(fh, activeFile.content)
      }
    } catch (e) { console.warn(e) }
  }
  
  const handleTogglePreview = () => {
    togglePreview()
  }
  
  const handleExportMarkdown = () => {
    if (activeFile?.content) {
      exportMarkdown(activeFile.content, activeFile.name)
    }
  }
  
  const handleExportHTML = async () => {
    if (activeFile?.content) {
      await exportHTML(activeFile.content, activeFile.name.replace('.md', '.html'))
    }
  }

  const handleExportSlides = async () => {
    if (activeFile?.content) {
      await exportReveal(activeFile.content, activeFile.name.replace('.md', '.slides.html'))
    }
  }
  const handlePreviewSlides = async () => {
    if (activeFile?.content) setSlidesPreviewVisible(true)
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
        onExportSlides={handleExportSlides}
        onPreviewSlides={handlePreviewSlides}
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
      <ProgressOverlay />
      
      {/* Settings Panel */}
      {settingsVisible && (
        <SettingsPanel onClose={toggleSettings} />
      )}

      {slidesPreviewVisible && activeFile?.content && (
        <SlidesPreview
          visible={slidesPreviewVisible}
          content={activeFile.content}
          title={activeFile.name.replace('.md', '')}
          onClose={() => setSlidesPreviewVisible(false)}
        />
      )}
    </div>
  )
}
