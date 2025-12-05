import { create } from 'zustand'
import { AppConfig, FileState, EditorState, EditorTab, FileTreeNode } from '@/types/editor'
import { generateId } from '@/utils/markdown'

interface EditorStore {
  // App configuration
  config: AppConfig
  setConfig: (config: Partial<AppConfig>) => void
  
  // File management
  activeFile: FileState | null
  openTabs: EditorTab[]
  fileTree: FileTreeNode[]
  rootDirHandle?: any
  
  // Editor state
  editorState: EditorState
  setEditorState: (state: Partial<EditorState>) => void
  editorMode: 'classic' | 'source'
  setEditorMode: (mode: 'classic' | 'source') => void
  markdownSource: string
  setMarkdownSource: (content: string) => void
  pmView: any | null
  setPmView: (view: any | null) => void
  runClassicCommand: (cmd: string, payload?: any) => void
  
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
  codeblockThemeDark: 'monokai'
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
    const next = {
      markdownSource: content
    } as any
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
  runClassicCommand: (cmd, payload) => {
    const { pmView, editorMode } = useEditorStore.getState()
    if (!pmView || editorMode !== 'classic') return
    const state = pmView.state
    const schema = state.schema
    const dispatch = (tr: any) => pmView.dispatch(tr)
    const sel = state.selection
    const from = sel.from, to = sel.to
    const textblock = sel.$from.parent
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
          const img = (schema.nodes as any).image?.create({ src, alt })
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
        case 'table':
          // placeholder only
          break
      }
    } catch {}
  },
  
  setActiveFile: (file) => set((state) => ({ activeFile: file, markdownSource: file?.content || '' })),
  
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
      // @ts-ignore
      const dirHandle = await (window as any).showDirectoryPicker()
      const { buildFileTreeWorker } = await import('@/utils/fsWorkerClient')
      const root = await buildFileTreeWorker(dirHandle, '')
      set({ rootDirHandle: dirHandle, fileTree: root })
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
    const content = await readFileWorker(node.handle)
    const file: FileState = {
      id: generateId(),
      path: node.path,
      name: node.name,
      content,
      originalContent: content,
      isDirty: false,
      isNewFile: false,
      fileHandle: node.handle
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
    // create directory via getDirectoryHandle
    // @ts-ignore
    const newDir = await dirHandle.getDirectoryHandle(name, { create: true })
    await get().refreshDirectory()
  },
  deleteNode: async (node) => {
    const dirHandle = node.type === 'file' ? findDirHandleByPath(get().fileTree, node.path.substring(0, node.path.lastIndexOf('/'))) : get().rootDirHandle
    const name = node.name
    if (!dirHandle) return
    // @ts-ignore
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
  
  previewVisible: true,
  togglePreview: () => set((state) => ({ previewVisible: !state.previewVisible })),
  
  editorRef: null as { insertSyntax: (syntax: string, placeholder?: string) => void } | null,
  setEditorRef: (ref: { insertSyntax: (syntax: string, placeholder?: string) => void } | null) => 
    set({ editorRef: ref }),
  
  insertMarkdownSyntax: (syntax: string, placeholder?: string, suffix?: string) => {
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
      isDirty: false
    }
    
    set((state) => ({
      activeFile: newFileState,
      markdownSource: '',
      openTabs: [...state.openTabs, {
        id: newFileState.id,
        name: newFileState.name,
        isActive: true,
        isDirty: false
      }]
    }))
  },
  
  saveFile: () => {
    const { activeFile } = useEditorStore.getState()
    if (!activeFile) return
    
    // This would integrate with Electron IPC for actual file saving
    console.log('Save file:', activeFile.name)
    
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
}))
function findDirHandleByPath(tree: FileTreeNode[], path: string): any | null {
  for (const n of tree) {
    if (n.type === 'directory') {
      if (n.path === path) return n.handle
      if (n.children) {
        const r = findDirHandleByPath(n.children, path)
        if (r) return r
      }
    }
  }
  return null
}
