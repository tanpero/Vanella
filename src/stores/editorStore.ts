import { create } from 'zustand'
import { AppConfig, FileState, EditorState, EditorTab, FileTreeNode, LoadingState } from '@/types/editor'
import { generateId } from '@/utils/markdown'
import type { EditorView } from 'prosemirror-view'
import type { Transaction } from 'prosemirror-state'
import { TextSelection } from 'prosemirror-state'

interface EditorStore {
  // App configuration
  config: AppConfig
  setConfig: (config: Partial<AppConfig>) => void
  
  // File management
  activeFile: FileState | null
  openTabs: EditorTab[]
  fileTree: FileTreeNode[]
  rootDirHandle?: FileSystemDirectoryHandle
  
  // Editor state
  editorState: EditorState
  setEditorState: (state: Partial<EditorState>) => void
  editorMode: 'classic' | 'source'
  setEditorMode: (mode: 'classic' | 'source') => void
  markdownSource: string
  setMarkdownSource: (content: string) => void
  pmView: EditorView | null
  setPmView: (view: EditorView | null) => void
  autofocusMathPos: number | null
  setAutofocusMathPos: (pos: number | null) => void
  runClassicCommand: (cmd: string, payload?: { level?: number; href?: string; src?: string; alt?: string; language?: string }) => void
  
  // File operations
  setActiveFile: (file: FileState | null) => void
  addTab: (tab: EditorTab) => void
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateFileContent: (content: string) => void
  setFileTree: (tree: FileTreeNode[]) => void
  pickDirectory: () => Promise<void>
  refreshDirectory: () => Promise<void>
  openFileNode: (node: FileTreeNode) => Promise<void>
  newFileIn: (dirPath?: string) => Promise<void>
  newFolderIn: (dirPath?: string) => Promise<void>
  deleteNode: (node: FileTreeNode) => Promise<void>
  renameNode: (node: FileTreeNode, newName: string) => Promise<void>
  
  // UI state
  sidebarVisible: boolean
  toggleSidebar: () => void
  
  // Settings
  settingsVisible: boolean
  toggleSettings: () => void

  // Context menu
  ctxVisible?: boolean
  ctxX?: number
  ctxY?: number
  showContextMenu: (x: number, y: number) => void
  hideContextMenu: () => void

  // Image insert card
  imageCardVisible: boolean
  imageCardX: number
  imageCardY: number
  showImageCard: (x: number, y: number) => void
  hideImageCard: () => void
  confirmInsertImage: (src: string, alt?: string) => void

  // Table insert dialog
  tableDialogVisible: boolean
  tableDialogX: number
  tableDialogY: number
  showTableDialog: (x: number, y: number) => void
  hideTableDialog: () => void
  confirmInsertTable: (rows: number, cols: number, header: boolean, aligns: Array<'left'|'center'|'right'>) => void
  runSourceTableCommand?: (cmd: 'row_add_above'|'row_add_below'|'col_add_left'|'col_add_right'|'row_delete'|'col_delete') => void

  

  // Editor ref and markdown helpers
  editorRef: { insertSyntax: (syntax: string, placeholder?: string) => void; selectRange?: (from: number, to: number) => void } | null
  setEditorRef: (ref: { insertSyntax: (syntax: string, placeholder?: string) => void; selectRange?: (from: number, to: number) => void } | null) => void
  insertMarkdownSyntax: (syntax: string, placeholder?: string, suffix?: string) => void

  // Basic file actions
  newFile: () => void
  saveFile: () => void

  // Loading overlay
  loadingState: LoadingState
  setLoading: (state: Partial<LoadingState>) => void
  clearLoading: () => void

  // Search/Replace
  searchVisible: boolean
  searchMode: 'find' | 'replace'
  searchQuery: string
  replaceQuery: string
  regexEnabled: boolean
  caseSensitive: boolean
  wholeWord: boolean
  searchIndex: number
  searchCount: number
  openFindToolbar: () => void
  openReplaceToolbar: () => void
  closeSearchToolbar: () => void
  setSearchQuery: (q: string) => void
  setReplaceQuery: (q: string) => void
  toggleRegex: () => void
  toggleCaseSensitive: () => void
  toggleWholeWord: () => void
  findNext: () => void
  findPrev: () => void
  replaceOne: () => void
  replaceAll: () => void
}

const defaultConfig: AppConfig = {
  theme: 'light',
  fontFamily: 'Consolas, Monaco, monospace',
  fontSize: 15,
  tabSize: 2,
  autoSave: true,
  autoSaveInterval: 5000,
  recentFiles: [],
  defaultExportPath: '',
  imageCaptionBelowCentered: false,
  codeblockThemeLight: 'material-light',
  codeblockThemeDark: 'monokai',
  slidePagination: 'separators',
  slideHeadingLevel: 2,
  revealNavigationMode: 'default'
}

const defaultEditorState: EditorState = {
  cursorPosition: 0,
  selectedText: '',
  isPreviewMode: false,
  scrollPosition: 0
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  config: defaultConfig,
  setConfig: (config) => set((state) => ({ 
    config: { ...state.config, ...config } 
  })),
  
  activeFile: null,
  openTabs: [],
  fileTree: [],
  rootDirHandle: undefined,
  
  editorState: defaultEditorState,
  setEditorState: (state) => set((prev) => ({ 
    editorState: { ...prev.editorState, ...state } 
  })),
  editorMode: 'classic',
  setEditorMode: (mode) => set({ editorMode: mode }),
  markdownSource: '',
  setMarkdownSource: (content) => set((state) => {
    const next: Partial<EditorStore> = {
      markdownSource: content
    }
    if (state.activeFile) {
      next.activeFile = {
        ...state.activeFile,
        content,
        isDirty: content !== state.activeFile.originalContent
      }
      next.openTabs = state.openTabs.map(tab => 
        tab.id === state.activeFile?.id 
          ? { ...tab, isDirty: content !== state.activeFile?.originalContent }
          : tab
      )
    }
    return next
  }),
  pmView: null,
  setPmView: (view) => set({ pmView: view }),
  autofocusMathPos: null,
  setAutofocusMathPos: (pos: number | null) => set({ autofocusMathPos: pos }),
  runClassicCommand: (cmd, payload) => {
    const { pmView, editorMode } = useEditorStore.getState()
    if (!pmView || editorMode !== 'classic') return
    const state = pmView.state
    const schema = state.schema
    const dispatch = (tr: Transaction) => pmView.dispatch(tr)
    const sel = state.selection
    const from = sel.from, to = sel.to
    try {
      switch (cmd) {
        case 'bold':
          dispatch(state.tr.addMark(from, to, schema.marks.strong.create()))
          break
        case 'italic':
          dispatch(state.tr.addMark(from, to, schema.marks.em.create()))
          break
        case 'code':
          dispatch(state.tr.addMark(from, to, schema.marks.code.create()))
          break
        case 'blockquote': {
          const tr = state.tr.setBlockType(sel.$from.start(), sel.$from.end(), schema.nodes.blockquote)
          dispatch(tr)
          break
        }
        case 'bullet_list': {
          const ul = schema.nodes.bullet_list.create(null, [schema.nodes.list_item.create(null, [schema.nodes.paragraph.create(null, [])])])
          dispatch(state.tr.replaceSelectionWith(ul))
          break
        }
        case 'ordered_list': {
          const ol = schema.nodes.ordered_list.create({ order: 1 }, [schema.nodes.list_item.create(null, [schema.nodes.paragraph.create(null, [])])])
          dispatch(state.tr.replaceSelectionWith(ol))
          break
        }
        case 'task_list': {
          const ul = schema.nodes.bullet_list.create(null, [schema.nodes.list_item.create({ checked: false }, [schema.nodes.paragraph.create(null, [])])])
          dispatch(state.tr.replaceSelectionWith(ul))
          break
        }
        case 'heading': {
          const level = payload?.level || 1
          const tr = state.tr.setBlockType(sel.$from.start(), sel.$from.end(), schema.nodes.heading, { level })
          dispatch(tr)
          break
        }
        case 'paragraph': {
          const tr = state.tr.setBlockType(sel.$from.start(), sel.$from.end(), schema.nodes.paragraph)
          dispatch(tr)
          break
        }
        case 'link': {
          const href = payload?.href || ''
          if (from !== to) {
            let tr = state.tr.removeMark(from, to, schema.marks.link)
            tr = tr.addMark(from, to, schema.marks.link.create({ href }))
            dispatch(tr)
          }
          break
        }
        case 'horizontal_rule': {
          dispatch(state.tr.replaceSelectionWith(schema.nodes.horizontal_rule.create()))
          break
        }
        case 'image': {
          const src = payload?.src || ''
          const alt = payload?.alt || ''
          const imageNode = (schema.nodes as unknown as { image?: import('prosemirror-model').NodeType }).image
          const img = imageNode?.create({ src, alt })
          if (img) dispatch(state.tr.replaceSelectionWith(img))
          break
        }
        case 'code_block': {
          const tr = state.tr.setBlockType(sel.$from.start(), sel.$from.end(), schema.nodes.code_block, { language: payload?.language || '' })
          dispatch(tr)
          break
        }
        case 'math_block': {
          dispatch(state.tr.replaceSelectionWith(schema.nodes.math_block.create()))
          break
        }
        case 'table': {
          const { showTableDialog } = useEditorStore.getState()
          showTableDialog(window.innerWidth / 2, 80)
          break
        }
      }
    } catch (e) { console.warn(e) }
  },
  
  setActiveFile: (file) => set(() => ({ activeFile: file, markdownSource: file?.content || '' })),
  
  addTab: (tab) => set((state) => {
    const existingTab = state.openTabs.find(t => t.id === tab.id)
    if (existingTab) {
      return { openTabs: state.openTabs.map(t => 
        t.id === tab.id ? { ...t, isActive: true } : { ...t, isActive: false }
      )}
    }
    return { 
      openTabs: [
        ...state.openTabs.map(t => ({ ...t, isActive: false })),
        tab
      ]
    }
  }),
  
  removeTab: (tabId) => set((state) => {
    const newTabs = state.openTabs.filter(t => t.id !== tabId)
    if (newTabs.length > 0 && state.openTabs.find(t => t.id === tabId)?.isActive) {
      newTabs[newTabs.length - 1].isActive = true
    }
    return { openTabs: newTabs }
  }),
  
  setActiveTab: (tabId) => set((state) => ({
    openTabs: state.openTabs.map(t => 
      t.id === tabId ? { ...t, isActive: true } : { ...t, isActive: false }
    )
  })),
  
  updateFileContent: (content) => set((state) => {
    if (!state.activeFile) return state
    return {
      markdownSource: content,
      activeFile: {
        ...state.activeFile,
        content,
        isDirty: content !== state.activeFile.originalContent
      },
      openTabs: state.openTabs.map(tab => 
        tab.id === state.activeFile?.id 
          ? { ...tab, isDirty: content !== state.activeFile?.originalContent }
          : tab
      )
    }
  }),
  
  setFileTree: (tree) => set({ fileTree: tree }),
  pickDirectory: async () => {
    try {
      const dirHandle = await window.showDirectoryPicker?.()
      const { buildFileTreeWorker } = await import('@/utils/fsWorkerClient')
      if (dirHandle) {
        const root = await buildFileTreeWorker(dirHandle, '')
        set({ rootDirHandle: dirHandle, fileTree: root })
      }
    } catch (e) { console.warn(e) }
  },
  refreshDirectory: async () => {
    const { rootDirHandle } = get()
    if (!rootDirHandle) return
    const { buildFileTreeWorker } = await import('@/utils/fsWorkerClient')
    const root = await buildFileTreeWorker(rootDirHandle, '')
    set({ fileTree: root })
  },
  openFileNode: async (node) => {
    if (node.type !== 'file' || !node.handle) return
    const { readFileWorker } = await import('@/utils/fsWorkerClient')
    const content = await readFileWorker(node.handle as FileSystemFileHandle)
    const file: FileState = {
      id: generateId(),
      path: node.path,
      name: node.name,
      content,
      originalContent: content,
      isDirty: false,
      isNewFile: false,
      fileHandle: node.handle as FileSystemFileHandle
    }
    set((state) => ({ activeFile: file, markdownSource: content, openTabs: [...state.openTabs, { id: file.id, name: file.name, path: file.path, isActive: true, isDirty: false }] }))
  },
  newFileIn: async (dirPath) => {
    const state = get()
    const dirHandle = dirPath ? findDirHandleByPath(state.fileTree, dirPath) : state.rootDirHandle
    if (!dirHandle) return
    const name = prompt('新建文件名：') || ''
    if (!name) return
    const { createFile } = await import('@/utils/fs')
    await createFile(dirHandle, name, '')
    await get().refreshDirectory()
  },
  newFolderIn: async (dirPath) => {
    const state = get()
    const dirHandle = dirPath ? findDirHandleByPath(state.fileTree, dirPath) : state.rootDirHandle
    if (!dirHandle) return
    const name = prompt('新建文件夹名：') || ''
    if (!name) return
    await dirHandle.getDirectoryHandle(name, { create: true })
    await get().refreshDirectory()
  },
  deleteNode: async (node) => {
    const dirHandle = node.type === 'file' ? findDirHandleByPath(get().fileTree, node.path.substring(0, node.path.lastIndexOf('/'))) : get().rootDirHandle
    const name = node.name
    if (!dirHandle) return
    await dirHandle.removeEntry(name, { recursive: node.type === 'directory' })
    await get().refreshDirectory()
  },
  renameNode: async (node, newName) => {
    if (!newName || newName === node.name) return
    if (node.type === 'file') {
      const dirHandle = node.parent
      const { renameFile } = await import('@/utils/fs')
      await renameFile(dirHandle, node.name, newName)
    } else {
      // directory rename not supported; create new dir and move? placeholder
      alert('目录重命名暂不支持')
    }
    await get().refreshDirectory()
  },
  
  sidebarVisible: true,
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  
  settingsVisible: false,
  toggleSettings: () => set((state) => ({ settingsVisible: !state.settingsVisible })),
  ctxVisible: false,
  ctxX: 0,
  ctxY: 0,
  showContextMenu: (x, y) => set({ ctxVisible: true, ctxX: x, ctxY: y }),
  hideContextMenu: () => set({ ctxVisible: false }),
  imageCardVisible: false,
  imageCardX: 0,
  imageCardY: 0,
  showImageCard: (x: number, y: number) => set({ imageCardVisible: true, imageCardX: x, imageCardY: y, ctxVisible: false }),
  hideImageCard: () => set({ imageCardVisible: false }),
  confirmInsertImage: (src: string, alt?: string) => {
    const { runClassicCommand } = useEditorStore.getState()
    runClassicCommand('image', { src, alt: alt || '' })
    set({ imageCardVisible: false })
  },
  
  

  tableDialogVisible: false,
  tableDialogX: 0,
  tableDialogY: 0,
  showTableDialog: (x: number, y: number) => set({ tableDialogVisible: true, tableDialogX: x, tableDialogY: y, ctxVisible: false }),
  hideTableDialog: () => set({ tableDialogVisible: false }),
  confirmInsertTable: (rows: number, cols: number, header: boolean, aligns: Array<'left'|'center'|'right'>) => {
    const { pmView, editorMode, markdownSource, editorState, setMarkdownSource } = useEditorStore.getState() as any
    if (editorMode === 'classic') {
      if (!pmView) return
      const state = pmView.state
      const schema = state.schema
      const makeRow = (isHeader: boolean) => {
        const cells = [] as import('prosemirror-model').Node[]
        for (let c = 0; c < cols; c++) {
          const cellType = isHeader ? (schema.nodes as any).table_header : (schema.nodes as any).table_cell
          const cell = cellType.create(null, [schema.nodes.paragraph.create(null, [])])
          cells.push(cell)
        }
        return (schema.nodes as any).table_row.create(null, cells)
      }
      const children = [] as import('prosemirror-model').Node[]
      if (header) children.push(makeRow(true))
      for (let r = 0; r < rows; r++) children.push(makeRow(false))
      const table = (schema.nodes as any).table.create({ colalign: aligns }, children)
      pmView.dispatch(state.tr.replaceSelectionWith(table))
    } else {
      const alignToken = (a: 'left'|'center'|'right') => a === 'left' ? ':---' : (a === 'center' ? ':---:' : '---:')
      const headerLine = header ? `| ${Array.from({ length: cols }).map((_, i) => `Header ${i + 1}`).join(' | ')} |\n` : `| ${Array.from({ length: cols }).map(() => ' ').join(' | ')} |\n`
      const alignLine = `| ${aligns.slice(0, cols).map(alignToken).join(' | ')} |\n`
      const bodyLines = Array.from({ length: rows }).map((_, r) => `| ${Array.from({ length: cols }).map((_, c) => `Cell ${r + 1}-${c + 1}`).join(' | ')} |`).join('\n')
      const snippet = `${headerLine}${alignLine}${bodyLines}\n`
      const pos = (editorState?.cursorPosition || 0) as number
      const before = (markdownSource || '').slice(0, pos)
      const after = (markdownSource || '').slice(pos)
      setMarkdownSource(before + snippet + after)
    }
    set({ tableDialogVisible: false })
  },
  runSourceTableCommand: (cmd) => {
    const { markdownSource, editorState, setMarkdownSource } = useEditorStore.getState() as any
    const content = markdownSource || ''
    const pos = (editorState?.cursorPosition || 0) as number
    const lines = content.split(/\n/)
    let charCount = 0
    let lineIdx = 0
    for (let i = 0; i < lines.length; i++) {
      const next = charCount + lines[i].length + 1
      if (pos <= next) { lineIdx = i; break }
      charCount = next
    }
    const isTableLine = (s: string) => /^\s*\|.*\|\s*$/.test(s)
    let start = lineIdx
    let end = lineIdx
    if (!isTableLine(lines[lineIdx])) return
    while (start > 0 && isTableLine(lines[start - 1])) start--
    while (end < lines.length - 1 && isTableLine(lines[end + 1])) end++
    const region = lines.slice(start, end + 1)
    const colCount = Math.max(...region.map(l => l.split('|').filter(x => x.trim().length > 0).length))
    const makeRow = () => `| ${Array.from({ length: colCount }).map((_, i) => `Cell ${i + 1}`).join(' | ')} |`
    const alignRow = () => `| ${Array.from({ length: colCount }).map(() => ':---').join(' | ')} |`
    const isAlignLine = (s: string) => /^\s*\|\s*(:?-+:?\s*\|\s*)+\s*$/.test(s)
    const idxAlign = region.findIndex(isAlignLine)
    const headerExists = idxAlign > 0
    const bodyStart = headerExists ? (start + idxAlign + 1) : start
    if (cmd === 'row_add_above') {
      const insertAt = bodyStart
      lines.splice(insertAt, 0, makeRow())
    } else if (cmd === 'row_add_below') {
      const insertAt = lineIdx + 1
      lines.splice(insertAt, 0, makeRow())
    } else if (cmd === 'row_delete') {
      lines.splice(lineIdx, 1)
    } else if (cmd === 'col_add_left' || cmd === 'col_add_right' || cmd === 'col_delete') {
      const currentLine = lines[lineIdx]
      const parts = currentLine.split('|')
      const cells = parts.map(s => s.trim())
      const nonEmptyIndexMap = [] as number[]
      for (let i = 0; i < cells.length; i++) if (cells[i].length > 0) nonEmptyIndexMap.push(i)
      const currentCellIdx = nonEmptyIndexMap.findIndex((idx, k) => k === 0 ? (pos <= charCount + parts.slice(0, idx).join('|').length) : false) // fallback to first cell
      const targetIdx = Math.max(0, currentCellIdx)
      for (let i = start; i <= end; i++) {
        const seg = lines[i].split('|')
        const items = seg.map(s => s.trim())
        const idxs = [] as number[]
        for (let jj = 0; jj < items.length; jj++) if (items[jj].length > 0) { idxs.push(jj) }
        const j = idxs[targetIdx] || idxs[0] || 1
        if (cmd === 'col_add_left') {
          items.splice(j, 0, i === start ? 'Header' : 'Cell')
        } else if (cmd === 'col_add_right') {
          items.splice(j + 1, 0, i === start ? 'Header' : 'Cell')
        } else {
          items.splice(j, 1)
        }
        lines[i] = `| ${items.filter(s => s.length > 0).join(' | ')} |`
      }
      if (idxAlign >= 0) lines[start + idxAlign] = alignRow()
    }
    setMarkdownSource(lines.join('\n'))
  },
  
  editorRef: null as { insertSyntax: (syntax: string, placeholder?: string) => void; selectRange?: (from: number, to: number) => void } | null,
  setEditorRef: (ref: { insertSyntax: (syntax: string, placeholder?: string) => void; selectRange?: (from: number, to: number) => void } | null) => 
    set({ editorRef: ref }),
  
  insertMarkdownSyntax: (syntax: string, placeholder?: string) => {
    const { editorRef } = useEditorStore.getState()
    if (editorRef) {
      editorRef.insertSyntax(syntax, placeholder)
    }
  },
  
  newFile: () => {
    const newFileState: FileState = {
      id: generateId(),
      path: `/untitled-${Date.now()}.md`,
      name: `untitled-${Date.now()}.md`,
      content: '',
      originalContent: '',
      isDirty: false,
      isNewFile: true
    }
    
    set((state) => ({
      activeFile: newFileState,
      markdownSource: '',
      openTabs: [...state.openTabs, {
        id: newFileState.id,
        name: newFileState.name,
        path: newFileState.path,
        isActive: true,
        isDirty: false
      }]
    }))
  },
  
  saveFile: async () => {
    const { activeFile } = useEditorStore.getState()
    if (!activeFile) return
    const api = (window as unknown as { api?: { saveFile?: (p: string, c: string) => Promise<boolean> } }).api
    const targetPath = activeFile.path
    if (api && api.saveFile && targetPath) {
      try { await api.saveFile(targetPath, activeFile.content) } catch (e) { console.warn('save-file failed', e) }
    }
    set((state) => ({
      activeFile: activeFile ? {
        ...activeFile,
        originalContent: activeFile.content,
        isDirty: false
      } : null,
      openTabs: state.openTabs.map(tab => 
        tab.id === activeFile?.id 
          ? { ...tab, isDirty: false }
          : tab
      )
    }))
  }
  ,
  loadingState: { active: false, stage: '', percent: 0, note: '', cancellable: false },
  setLoading: (state) => set((prev) => ({ loadingState: { ...prev.loadingState, ...state } })),
  clearLoading: () => set({ loadingState: { active: false, stage: '', percent: 0, note: '', cancellable: false } })
  ,
  searchVisible: false,
  searchMode: 'find',
  searchQuery: '',
  replaceQuery: '',
  regexEnabled: false,
  caseSensitive: false,
  wholeWord: false,
  searchIndex: 0,
  searchCount: 0,
  openFindToolbar: () => set({ searchVisible: true, searchMode: 'find' }),
  openReplaceToolbar: () => set({ searchVisible: true, searchMode: 'replace' }),
  closeSearchToolbar: () => set({ searchVisible: false }),
  setSearchQuery: (q: string) => {
    const next = q || ''
    const mode = get().editorMode
    if (mode === 'classic') {
      const view = get().pmView
      const anchor = view ? view.state.selection.from : 0
      const matches = computePmMatches(next, get().regexEnabled, get().caseSensitive, get().wholeWord)
      const startIdx = matches.findIndex(m => m.from >= anchor)
      const idx = startIdx >= 0 ? startIdx : (matches.length > 0 ? 0 : 0)
      set({ searchQuery: next, searchIndex: idx, searchCount: matches.length })
      if (matches.length > 0) selectPmRange(matches[idx].from, matches[idx].to)
    } else {
      const anchor = (get().editorState?.cursorPosition || 0) as number
      const matches = computeSourceMatches(get().markdownSource || '', next, get().regexEnabled, get().caseSensitive, get().wholeWord)
      const startIdx = matches.findIndex(m => m.from >= anchor)
      const idx = startIdx >= 0 ? startIdx : (matches.length > 0 ? 0 : 0)
      set({ searchQuery: next, searchIndex: idx, searchCount: matches.length })
      if (matches.length > 0) selectSourceRange(matches[idx].from, matches[idx].to)
    }
  },
  setReplaceQuery: (q: string) => set({ replaceQuery: q || '' }),
  toggleRegex: () => {
    const { searchQuery, caseSensitive, editorMode, wholeWord } = get()
    const regexEnabled = !get().regexEnabled
    if (editorMode === 'classic') {
      const matches = computePmMatches(searchQuery, regexEnabled, caseSensitive, wholeWord)
      set({ regexEnabled, searchIndex: matches.length > 0 ? Math.min(get().searchIndex, matches.length - 1) : 0, searchCount: matches.length })
      if (matches.length > 0) selectPmRange(matches[Math.min(get().searchIndex, matches.length - 1)].from, matches[Math.min(get().searchIndex, matches.length - 1)].to)
    } else {
      const matches = computeSourceMatches(get().markdownSource || '', searchQuery, regexEnabled, caseSensitive, wholeWord)
      set({ regexEnabled, searchIndex: matches.length > 0 ? Math.min(get().searchIndex, matches.length - 1) : 0, searchCount: matches.length })
      if (matches.length > 0) selectSourceRange(matches[Math.min(get().searchIndex, matches.length - 1)].from, matches[Math.min(get().searchIndex, matches.length - 1)].to)
    }
  },
  toggleCaseSensitive: () => {
    const { searchQuery, regexEnabled, editorMode, wholeWord } = get()
    const caseSensitive = !get().caseSensitive
    if (editorMode === 'classic') {
      const matches = computePmMatches(searchQuery, regexEnabled, caseSensitive, wholeWord)
      set({ caseSensitive, searchIndex: matches.length > 0 ? Math.min(get().searchIndex, matches.length - 1) : 0, searchCount: matches.length })
      if (matches.length > 0) selectPmRange(matches[Math.min(get().searchIndex, matches.length - 1)].from, matches[Math.min(get().searchIndex, matches.length - 1)].to)
    } else {
      const matches = computeSourceMatches(get().markdownSource || '', searchQuery, regexEnabled, caseSensitive, wholeWord)
      set({ caseSensitive, searchIndex: matches.length > 0 ? Math.min(get().searchIndex, matches.length - 1) : 0, searchCount: matches.length })
      if (matches.length > 0) selectSourceRange(matches[Math.min(get().searchIndex, matches.length - 1)].from, matches[Math.min(get().searchIndex, matches.length - 1)].to)
    }
  },
  toggleWholeWord: () => {
    const { searchQuery, regexEnabled, caseSensitive, editorMode } = get()
    const wholeWord = !get().wholeWord
    if (editorMode === 'classic') {
      const matches = computePmMatches(searchQuery, regexEnabled, caseSensitive, wholeWord)
      set({ wholeWord, searchIndex: matches.length > 0 ? Math.min(get().searchIndex, matches.length - 1) : 0, searchCount: matches.length })
      if (matches.length > 0) selectPmRange(matches[Math.min(get().searchIndex, matches.length - 1)].from, matches[Math.min(get().searchIndex, matches.length - 1)].to)
    } else {
      const matches = computeSourceMatches(get().markdownSource || '', searchQuery, regexEnabled, caseSensitive, wholeWord)
      set({ wholeWord, searchIndex: matches.length > 0 ? Math.min(get().searchIndex, matches.length - 1) : 0, searchCount: matches.length })
      if (matches.length > 0) selectSourceRange(matches[Math.min(get().searchIndex, matches.length - 1)].from, matches[Math.min(get().searchIndex, matches.length - 1)].to)
    }
  },
  findNext: () => {
    const { editorMode, searchQuery, regexEnabled, caseSensitive, wholeWord } = get()
    if (!searchQuery) return
    if (editorMode === 'classic') {
      const matches = computePmMatches(searchQuery, regexEnabled, caseSensitive, wholeWord)
      if (matches.length === 0) { set({ searchCount: 0 }); return }
      const idx = (get().searchIndex + 1) % matches.length
      set({ searchIndex: idx, searchCount: matches.length })
      const m = matches[idx]
      selectPmRange(m.from, m.to)
    } else {
      const src = get().markdownSource || ''
      const matches = computeSourceMatches(src, searchQuery, regexEnabled, caseSensitive, wholeWord)
      if (matches.length === 0) { set({ searchCount: 0 }); return }
      const idx = (get().searchIndex + 1) % matches.length
      set({ searchIndex: idx, searchCount: matches.length })
      const m = matches[idx]
      selectSourceRange(m.from, m.to)
    }
  },
  findPrev: () => {
    const { editorMode, searchQuery, regexEnabled, caseSensitive, wholeWord } = get()
    if (!searchQuery) return
    if (editorMode === 'classic') {
      const matches = computePmMatches(searchQuery, regexEnabled, caseSensitive, wholeWord)
      if (matches.length === 0) { set({ searchCount: 0 }); return }
      const idx = (get().searchIndex - 1 + matches.length) % matches.length
      set({ searchIndex: idx, searchCount: matches.length })
      const m = matches[idx]
      selectPmRange(m.from, m.to)
    } else {
      const src = get().markdownSource || ''
      const matches = computeSourceMatches(src, searchQuery, regexEnabled, caseSensitive, wholeWord)
      if (matches.length === 0) { set({ searchCount: 0 }); return }
      const idx = (get().searchIndex - 1 + matches.length) % matches.length
      set({ searchIndex: idx, searchCount: matches.length })
      const m = matches[idx]
      selectSourceRange(m.from, m.to)
    }
  },
  replaceOne: () => {
    const { editorMode, searchQuery, replaceQuery, regexEnabled, caseSensitive, wholeWord } = get()
    if (!searchQuery) return
    if (editorMode === 'classic') {
      const view = get().pmView
      if (!view) return
      const matches = computePmMatches(searchQuery, regexEnabled, caseSensitive, wholeWord)
      if (matches.length === 0) return
      const idx = Math.min(get().searchIndex, matches.length - 1)
      const m = matches[idx]
      const text = replaceWith(searchQuery, replaceQuery, view.state.doc.textBetween(m.from, m.to), regexEnabled, caseSensitive)
      const tr = view.state.tr.insertText(text, m.from, m.to)
      view.dispatch(tr)
      const nextMatches = computePmMatches(searchQuery, regexEnabled, caseSensitive, wholeWord)
      set({ searchIndex: Math.min(idx, Math.max(0, nextMatches.length - 1)), searchCount: nextMatches.length })
    } else {
      const src = get().markdownSource || ''
      const matches = computeSourceMatches(src, searchQuery, regexEnabled, caseSensitive, wholeWord)
      if (matches.length === 0) return
      const idx = Math.min(get().searchIndex, matches.length - 1)
      const m = matches[idx]
      const segment = src.slice(m.from, m.to)
      const text = replaceWith(searchQuery, replaceQuery, segment, regexEnabled, caseSensitive)
      const next = src.slice(0, m.from) + text + src.slice(m.to)
      get().setMarkdownSource(next)
      const nextMatches = computeSourceMatches(next, searchQuery, regexEnabled, caseSensitive, wholeWord)
      set({ searchIndex: Math.min(idx, Math.max(0, nextMatches.length - 1)), searchCount: nextMatches.length })
      selectSourceRange(Math.min(m.from + text.length, next.length), Math.min(m.from + text.length, next.length))
    }
  },
  replaceAll: async () => {
    const { editorMode, searchQuery, replaceQuery, regexEnabled, caseSensitive, wholeWord } = get()
    if (!searchQuery) return
    if (editorMode === 'classic') {
      const view = get().pmView
      if (!view) return
      const { pmDocToMarkdown } = await import('@/markdown/convert')
      const raw = await pmDocToMarkdown(view.state.doc as any)
      const next = replaceAllText(raw, searchQuery, replaceQuery, regexEnabled, caseSensitive, wholeWord)
      const { markdownToPmDoc } = await import('@/markdown/convert')
      const doc = await markdownToPmDoc(view.state.schema as any, next)
      const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, doc.content)
      view.dispatch(tr)
      set({ searchCount: computePmMatches(searchQuery, regexEnabled, caseSensitive, wholeWord).length })
    } else {
      const src = get().markdownSource || ''
      const next = replaceAllText(src, searchQuery, replaceQuery, regexEnabled, caseSensitive, wholeWord)
      get().setMarkdownSource(next)
      set({ searchCount: computeSourceMatches(next, searchQuery, regexEnabled, caseSensitive, wholeWord).length })
    }
  }
}))
function findDirHandleByPath(tree: FileTreeNode[], path: string): FileSystemDirectoryHandle | null {
  for (const n of tree) {
    if (n.type === 'directory') {
      if (n.path === path) return n.handle as FileSystemDirectoryHandle
      if (n.children) {
        const r = findDirHandleByPath(n.children, path)
        if (r) return r
      }
    }
  }
  return null
}

function buildRegex(query: string, regexEnabled: boolean, caseSensitive: boolean, wholeWord: boolean): RegExp | null {
  if (!query) return null
  try {
    let source = regexEnabled ? query : escapeReg(query)
    if (wholeWord) source = `\\b${source}\\b`
    const flags = 'g' + (caseSensitive ? '' : 'i')
    return new RegExp(source, flags)
  } catch { return null }
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function computeSourceMatches(text: string, query: string, regexEnabled: boolean, caseSensitive: boolean, wholeWord: boolean): Array<{ from: number; to: number }> {
  const re = buildRegex(query, regexEnabled, caseSensitive, wholeWord)
  if (!re) return []
  const out: Array<{ from: number; to: number }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    out.push({ from: m.index, to: m.index + m[0].length })
    if (m[0].length === 0) re.lastIndex++
  }
  return out
}

function computePmMatches(query: string, regexEnabled: boolean, caseSensitive: boolean, wholeWord: boolean): Array<{ from: number; to: number }> {
  const view = useEditorStore.getState().pmView
  if (!view || !query) return []
  const re = buildRegex(query, regexEnabled, caseSensitive, wholeWord)
  if (!re) return []
  const out: Array<{ from: number; to: number }> = []
  const doc = view.state.doc
  doc.descendants((node, from) => {
    if (node.isText && typeof node.text === 'string') {
      const text = node.text
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) {
        const s = from + m.index
        const e = s + m[0].length
        out.push({ from: s, to: e })
        if (m[0].length === 0) re.lastIndex++
      }
    }
  })
  return out
}

function selectPmRange(from: number, to: number) {
  const view = useEditorStore.getState().pmView
  if (!view) return
  const maxPos = view.state.doc.content.size
  const anchor = Math.min(Math.max(0, from), maxPos)
  const head = Math.min(Math.max(0, to), maxPos)
  const sel = TextSelection.create(view.state.doc, Math.min(anchor, head), Math.max(anchor, head))
  view.dispatch(view.state.tr.setSelection(sel).scrollIntoView())
  try {
    const coords = view.coordsAtPos(Math.min(anchor, head))
    const container = (view.dom.closest('.pm-shell') as HTMLElement) || (view.dom.parentElement as HTMLElement)
    if (container) {
      const rect = container.getBoundingClientRect()
      const current = container.scrollTop
      const relTop = coords.top - rect.top + current
      const target = Math.max(0, relTop - container.clientHeight / 2)
      container.scrollTo({ top: target })
    }
  } catch { void 0 }
}

function selectSourceRange(from: number, to: number) {
  const editorRefObj = useEditorStore.getState().editorRef
  const fn = editorRefObj?.selectRange
  if (fn) fn(from, to)
}

function replaceWith(query: string, replaceQuery: string, segment: string, regexEnabled: boolean, caseSensitive: boolean): string {
  const re = buildRegex(query, regexEnabled, caseSensitive, false)
  if (!re) return segment
  return segment.replace(re, replaceQuery)
}

function replaceAllText(text: string, query: string, replaceQuery: string, regexEnabled: boolean, caseSensitive: boolean, wholeWord: boolean): string {
  const re = buildRegex(query, regexEnabled, caseSensitive, wholeWord)
  if (!re) return text
  return text.replace(re, replaceQuery)
}
