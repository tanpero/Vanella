import React, { useEffect, useRef, useCallback } from 'react'
import { EditorView, drawSelection, dropCursor, highlightActiveLine } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { keymap } from '@codemirror/view'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { useEditorStore } from '@/stores/editorStore'
import { insertMarkdownSyntax } from '@/utils/markdown'

interface MarkdownEditorProps {
  className?: string
  onChange?: (content: string) => void
  onSelectionChange?: (selection: { from: number; to: number }) => void
}

const MarkdownEditor = React.forwardRef<{
  insertSyntax: (syntax: string, placeholder?: string) => void
}, MarkdownEditorProps>(({ 
  className = '', 
  onChange, 
  onSelectionChange 
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  
  const { 
    config, 
    setEditorState,
    markdownSource,
    setMarkdownSource 
  } = useEditorStore()
  
  const isDarkTheme = config.theme === 'dark'
  
  const handleContentChange = useCallback((content: string) => {
    setMarkdownSource(content)
    onChange?.(content)
  }, [setMarkdownSource, onChange])
  
  const handleSelectionChange = useCallback((selection: { from: number; to: number }) => {
    setEditorState({ 
      cursorPosition: selection.from,
      selectedText: markdownSource.slice(selection.from, selection.to) || ''
    })
    onSelectionChange?.(selection)
  }, [setEditorState, markdownSource, onSelectionChange])
  
  useEffect(() => {
    if (!editorRef.current) return
    if (viewRef.current) return
    
    const extensions = [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      drawSelection(),
      dropCursor(),
      highlightActiveLine(),
      syntaxHighlighting(defaultHighlightStyle),
      markdown(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const content = update.state.doc.toString()
          handleContentChange(content)
        }
        if (update.selectionSet) {
          const selection = update.state.selection.main
          handleSelectionChange({
            from: selection.from,
            to: selection.to
          })
        }
      }),
      EditorView.theme({
        '&': {
          fontSize: `${config.fontSize}px`,
          fontFamily: 'Consolas, Monaco, monospace'
        },
        '.cm-content': {
          padding: '16px',
          minHeight: '100%'
        },
        '.cm-line': {
          padding: '0 8px'
        },
        '.cm-focused': {
          outline: 'none'
        },
        '.cm-cursor': {
          borderLeftWidth: '2px'
        },
        '.cm-selectionBackground': {
          backgroundColor: isDarkTheme ? '#264f78' : '#add6ff'
        }
      })
    ]
    
    if (isDarkTheme) {
      extensions.push(oneDark)
    }
    
    const state = EditorState.create({
      doc: markdownSource || '',
      extensions
    })
    
    const view = new EditorView({
      state,
      parent: editorRef.current
    })
    
    viewRef.current = view
    
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [isDarkTheme, config.fontSize, markdownSource, handleContentChange, handleSelectionChange])
  
  useEffect(() => {
    if (viewRef.current) {
      const currentContent = viewRef.current.state.doc.toString()
      if (currentContent !== markdownSource) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: viewRef.current.state.doc.length,
            insert: markdownSource
          }
        })
      }
    }
  }, [markdownSource])
  
  useEffect(() => {
    if (viewRef.current) {
      // Reconfigure editor with new extensions
      const newState = EditorState.create({
        doc: viewRef.current.state.doc.toString(),
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          drawSelection(),
          dropCursor(),
          highlightActiveLine(),
          syntaxHighlighting(defaultHighlightStyle),
          markdown(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const content = update.state.doc.toString()
              handleContentChange(content)
            }
            if (update.selectionSet) {
              const selection = update.state.selection.main
              handleSelectionChange({
                from: selection.from,
                to: selection.to
              })
            }
          })
        ]
      })
      
      viewRef.current.setState(newState)
    }
  }, [isDarkTheme, config.fontSize, config.fontFamily, handleContentChange, handleSelectionChange])
  
  const insertSyntax = (syntax: string, placeholder?: string) => {
    if (!viewRef.current) return
    
    const selection = viewRef.current.state.selection.main
    const currentContent = viewRef.current.state.doc.toString()
    
    const { newContent, newCursorPos } = insertMarkdownSyntax(
      currentContent,
      selection.from,
      selection.to,
      syntax,
      placeholder
    )
    
    viewRef.current.dispatch({
      changes: {
        from: 0,
        to: viewRef.current.state.doc.length,
        insert: newContent
      },
      selection: { anchor: newCursorPos }
    })
    
    handleContentChange(newContent)
  }
  
  React.useImperativeHandle(ref, () => ({
    insertSyntax
  }))
  
  return (
    <div 
      ref={editorRef} 
      className={`markdown-editor ${className}`}
      style={{ 
        height: '100%',
        width: '100%',
        border: isDarkTheme ? '1px solid #374151' : '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    />
  )
})

MarkdownEditor.displayName = 'MarkdownEditor'

export default MarkdownEditor
