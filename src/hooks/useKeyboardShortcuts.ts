import { useEffect } from 'react'
import { useEditorStore } from '@/stores/editorStore'

export const useKeyboardShortcuts = () => {
  const { 
    activeFile, 
    insertMarkdownSyntax, 
    newFile, 
    saveFile, 
    toggleSettings,
    openFindToolbar,
    openReplaceToolbar,
    closeSearchToolbar,
    searchVisible 
  } = useEditorStore()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when no input is focused
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return
      }

      const { key, ctrlKey, metaKey, shiftKey } = event
      const isCmd = ctrlKey || metaKey

      // File operations
      if (isCmd && key === 'n') {
        event.preventDefault()
        newFile()
      } else if (isCmd && shiftKey && key === 's') {
        event.preventDefault()
        // Save as functionality (placeholder)
        console.log('Save as...')
      } else if (isCmd && key === 's') {
        event.preventDefault()
        saveFile()
      } else if (isCmd && shiftKey && key === 'm') {
        event.preventDefault()
        // Export markdown - this would need to be implemented in the component
        console.log('Export markdown...')
      } else if (isCmd && shiftKey && key === 'h') {
        event.preventDefault()
        // Export HTML - this would need to be implemented in the component
        console.log('Export HTML...')
      }

      // Format shortcuts (only when file is active)
      if (activeFile && isCmd) {
        switch (key) {
          case 'b':
            event.preventDefault()
            insertMarkdownSyntax('**', 'bold text')
            break
          case 'i':
            event.preventDefault()
            insertMarkdownSyntax('*', 'italic text')
            break
          case 'k':
            event.preventDefault()
            insertMarkdownSyntax('[', 'link text', '](')
            break
          case 'e':
            event.preventDefault()
            insertMarkdownSyntax('`', 'code')
            break
        }
      }

      // UI toggles
      if (isCmd && key === ',') {
        event.preventDefault()
        toggleSettings()
      } else if (isCmd && key === 'f') {
        event.preventDefault()
        openFindToolbar()
      } else if (isCmd && key === 'h') {
        event.preventDefault()
        openReplaceToolbar()
      }

      // Heading shortcuts
      if (activeFile && key >= '1' && key <= '6' && isCmd && shiftKey) {
        event.preventDefault()
        const level = parseInt(key)
        insertMarkdownSyntax('#'.repeat(level) + ' ', `Heading ${level}`)
      }

      // List shortcuts
      if (activeFile && isCmd && shiftKey) {
        switch (key) {
          case 'l':
            event.preventDefault()
            insertMarkdownSyntax('- ', 'list item')
            break
          case 'o':
            event.preventDefault()
            insertMarkdownSyntax('1. ', 'ordered list item')
            break
          case 'q':
            event.preventDefault()
            insertMarkdownSyntax('> ', 'quote')
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (searchVisible) {
          event.preventDefault()
          closeSearchToolbar()
        }
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [activeFile, insertMarkdownSyntax, newFile, saveFile, toggleSettings, openFindToolbar, openReplaceToolbar, closeSearchToolbar, searchVisible])
}
