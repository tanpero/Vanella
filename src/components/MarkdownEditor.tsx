import React, { useEffect, useRef, useCallback } from 'react'
import { EditorView, drawSelection, dropCursor, highlightActiveLine, ViewPlugin, Decoration, DecorationSet } from '@codemirror/view'
import type { ViewUpdate } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { EditorState, EditorSelection } from '@codemirror/state'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { keymap } from '@codemirror/view'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { useEditorStore } from '@/stores/editorStore'
import { insertMarkdownSyntax } from '@/utils/markdown'
import { mapTheme } from '@/modes/shared/codemirrorConfig'

interface MarkdownEditorProps {
  className?: string
  onChange?: (content: string) => void
  onSelectionChange?: (selection: { from: number; to: number }) => void
}

const MarkdownEditor = React.forwardRef<{
  insertSyntax: (syntax: string, placeholder?: string) => void,
  selectRange: (from: number, to: number) => void
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
    setMarkdownSource,
    regexEnabled,
    caseSensitive,
    wholeWord 
  } = useEditorStore()
  
  const isDarkTheme = config.theme === 'dark'
  const suppressSyncRef = useRef(false)
  const buildRegex = (q: string) => {
    let src = regexEnabled ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (wholeWord && q) src = `\\b${src}\\b`
    const flags = 'g' + (caseSensitive ? '' : 'i')
    try { return q ? new RegExp(src, flags) : null } catch { return null }
  }
  const searchHighlight = ViewPlugin.fromClass(class {
    decorations: DecorationSet
    constructor(view: EditorView) { this.decorations = this.make(view) }
    update(update: ViewUpdate) { this.decorations = this.make(update.view) }
    make(view: EditorView) {
      const q = useEditorStore.getState().searchQuery
      const vis = useEditorStore.getState().searchVisible
      const activeIdx = useEditorStore.getState().searchIndex
      const re = buildRegex(q || '')
      if (!vis || !q || !re) return Decoration.none
      const text = view.state.doc.toString()
      const marks: Array<ReturnType<Decoration['range']>> = []
      re.lastIndex = 0
      let m: RegExpExecArray | null
      let idx = 0
      while ((m = re.exec(text)) !== null) {
        const from = m.index
        const to = from + m[0].length
        const cls = (idx === activeIdx) ? 'cm-search-hit-active' : 'cm-search-hit'
        marks.push(Decoration.mark({ class: cls }).range(from, to))
        idx++
        if (m[0].length === 0) re.lastIndex++
      }
      return Decoration.set(marks, true)
    }
  }, { decorations: v => v.decorations })
  
  const handleContentChange = useCallback((content: string) => {
    setMarkdownSource(content)
    onChange?.(content)
  }, [setMarkdownSource, onChange])
  
  // onSelectionChange is handled inline in updateListener
  
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
      searchHighlight,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const content = update.state.doc.toString()
          handleContentChange(content)
          suppressSyncRef.current = true
        }
        if (update.selectionSet) {
          const selection = update.state.selection.main
          const docText = update.state.doc.toString()
          onSelectionChange?.({ from: selection.from, to: selection.to })
          setEditorState({
            cursorPosition: selection.from,
            selectedText: docText.slice(selection.from, selection.to) || ''
          })
        }
      }),
          EditorView.theme({
            '&': {
              fontSize: `${config.fontSize}px`,
              fontFamily: 'Consolas, Monaco, monospace',
              background: 'transparent'
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
          }),
          mapTheme(isDarkTheme ? 'material-dark' : 'material-light', isDarkTheme)
    ]
    
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
  }, [isDarkTheme, config.fontSize])
  
  useEffect(() => {
    if (viewRef.current) {
      if (suppressSyncRef.current) { suppressSyncRef.current = false; return }
      const currentContent = viewRef.current.state.doc.toString()
      if (currentContent !== markdownSource) {
        const sel = viewRef.current.state.selection.main
        const nextLen = (markdownSource || '').length
        viewRef.current.dispatch({
          changes: { from: 0, to: viewRef.current.state.doc.length, insert: markdownSource },
          selection: { anchor: Math.min(sel.from, nextLen), head: Math.min(sel.to, nextLen) }
        })
      }
    }
  }, [markdownSource])
  
  useEffect(() => {
    if (viewRef.current) {
      const prevSel = viewRef.current.state.selection.main
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
              const docText = update.state.doc.toString()
              setEditorState({
                cursorPosition: selection.from,
                selectedText: docText.slice(selection.from, selection.to) || ''
              })
            }
          }),
          EditorView.theme({
            '&': {
              fontSize: `${config.fontSize}px`,
              fontFamily: 'Consolas, Monaco, monospace',
              background: 'transparent',
              border: 'none',
              borderRadius: '0'
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
          }),
          mapTheme(isDarkTheme ? 'material-dark' : 'material-light', isDarkTheme)
        ]
      })
      viewRef.current.setState(newState)
      viewRef.current.dispatch({ selection: { anchor: prevSel.from, head: prevSel.to } })
    }
  }, [isDarkTheme, config.fontSize, config.fontFamily, handleContentChange, setEditorState])
  
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

  const selectRange = (from: number, to: number) => {
    if (!viewRef.current) return
    const s = EditorSelection.range(from, to)
    const view = viewRef.current
    view.dispatch({ selection: s, scrollIntoView: true })
    const coords = view.coordsAtPos(Math.min(from, to))
    const scroller = view.scrollDOM
    const containerRect = scroller.getBoundingClientRect()
    const current = scroller.scrollTop
    const relTop = coords.top - containerRect.top + current
    const target = Math.max(0, relTop - scroller.clientHeight / 2)
    scroller.scrollTo({ top: target })
  }
  
  React.useImperativeHandle(ref, () => ({
    insertSyntax,
    selectRange
  }))
  
  return (
    <div 
      ref={editorRef} 
      className={`markdown-editor ${className}`}
      style={{ 
        height: '100%',
        width: '100%',
        border: 'none',
        borderRadius: '0',
        background: 'transparent',
        overflow: 'hidden'
      }}
    />
  )
})

MarkdownEditor.displayName = 'MarkdownEditor'

export default MarkdownEditor
