import React, { useState } from 'react'
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  FolderOpen,
  Plus,
  RefreshCw
} from 'lucide-react'
import { useEditorStore } from '@/stores/editorStore'
import { FileTreeNode } from '@/types/editor'

interface SidebarProps {
  className?: string
}

interface FileTreeItemProps {
  node: FileTreeNode
  depth: number
  onFileClick: (path: string) => void
  onFolderToggle: (path: string) => void
  isDarkTheme: boolean
}

function FileTreeItem({ node, depth, onFileClick, onFolderToggle, isDarkTheme }: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(node.isExpanded || false)
  const [menuPos, setMenuPos] = useState<{x:number,y:number}|null>(null)
  
  const handleClick = () => {
    if (node.type === 'directory') {
      setIsExpanded(!isExpanded)
      onFolderToggle(node.path)
    } else {
      onFileClick(node.path)
    }
  }
  
  const paddingLeft = depth * 16 + 8
  
  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={(e) => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }) }}
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingLeft: `${paddingLeft}px`,
          paddingRight: '8px',
          paddingTop: '4px',
          paddingBottom: '4px',
          cursor: 'pointer',
          color: isDarkTheme ? '#d1d5db' : '#374151',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isDarkTheme ? '#374151' : '#f3f4f6'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        {node.type === 'directory' ? (
          <>
            {isExpanded ? (
              <ChevronDown size={16} style={{ marginRight: '4px' }} />
            ) : (
              <ChevronRight size={16} style={{ marginRight: '4px' }} />
            )}
            {isExpanded ? (
              <FolderOpen size={16} style={{ marginRight: '8px', color: '#f59e0b' }} />
            ) : (
              <Folder size={16} style={{ marginRight: '8px', color: '#f59e0b' }} />
            )}
          </>
        ) : (
          <>
            <div style={{ width: '16px', marginRight: '4px' }} />
            <File size={16} style={{ marginRight: '8px', color: '#6b7280' }} />
          </>
        )}
        <span style={{ fontSize: '14px', userSelect: 'none' }}>{node.name}</span>
      </div>
      {menuPos && (
        <div style={{ position: 'fixed', left: menuPos.x + 4, top: menuPos.y + 4, background: isDarkTheme ? '#1f2937' : '#ffffff', border: `1px solid ${isDarkTheme ? '#374151' : '#e5e7eb'}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.12)' }} onMouseLeave={() => setMenuPos(null)}>
          {node.type === 'file' ? (
            <div style={{ display:'flex', flexDirection:'column' }}>
              <button style={{ padding: '6px 10px', background:'transparent', border:'none', textAlign:'left', cursor:'pointer', color: isDarkTheme ? '#d1d5db' : '#374151' }} onClick={() => { const newName = prompt('重命名为：', node.name) || ''; if (newName) (useEditorStore.getState().renameNode(node, newName)); setMenuPos(null) }}>重命名</button>
              <button style={{ padding: '6px 10px', background:'transparent', border:'none', textAlign:'left', cursor:'pointer', color: '#dc2626' }} onClick={() => { useEditorStore.getState().deleteNode(node); setMenuPos(null) }}>删除</button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column' }}>
              <button style={{ padding: '6px 10px', background:'transparent', border:'none', textAlign:'left', cursor:'pointer', color: isDarkTheme ? '#d1d5db' : '#374151' }} onClick={() => { useEditorStore.getState().newFileIn(node.path); setMenuPos(null) }}>新建文件</button>
              <button style={{ padding: '6px 10px', background:'transparent', border:'none', textAlign:'left', cursor:'pointer', color: isDarkTheme ? '#d1d5db' : '#374151' }} onClick={() => { useEditorStore.getState().newFolderIn(node.path); setMenuPos(null) }}>新建文件夹</button>
              <button style={{ padding: '6px 10px', background:'transparent', border:'none', textAlign:'left', cursor:'pointer', color: '#dc2626' }} onClick={() => { useEditorStore.getState().deleteNode(node); setMenuPos(null) }}>删除</button>
            </div>
          )}
        </div>
      )}
      
      {node.type === 'directory' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileClick={onFileClick}
              onFolderToggle={onFolderToggle}
              isDarkTheme={isDarkTheme}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const { fileTree, config, pickDirectory, refreshDirectory, openFileNode } = useEditorStore()
  
  const isDarkTheme = config.theme === 'dark'
  
  // Mock file tree data - in a real app, this would come from the file system
  const mockFileTree: FileTreeNode[] = []
  
  const handleFileClick = (path: string) => {
    const node = findNodeByPath(fileTree, path)
    if (node) openFileNode(node)
  }
  
  const handleFolderToggle = (path: string) => {
    console.log(`Toggling folder: ${path}`)
  }
  
  const handleNewFile = () => useEditorStore.getState().newFileIn('')
  
  const handleRefresh = () => { refreshDirectory() }
  
  return (
    <div 
      className={`sidebar ${className}`}
      style={{
        width: '250px',
        backgroundColor: isDarkTheme ? '#111827' : '#ffffff',
        borderRight: isDarkTheme ? '1px solid #374151' : '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      {/* Sidebar header */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: isDarkTheme ? '1px solid #374151' : '1px solid #e5e7eb'
        }}
      >
        <h3 style={{ 
          margin: 0, 
          fontSize: '14px', 
          fontWeight: '600',
          color: isDarkTheme ? '#d1d5db' : '#374151'
        }}>
          Files
        </h3>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={handleNewFile}
            title="New File"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              color: isDarkTheme ? '#d1d5db' : '#374151',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkTheme ? '#374151' : '#f3f4f6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => pickDirectory()}
            title="Open Folder"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              color: isDarkTheme ? '#d1d5db' : '#374151',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkTheme ? '#374151' : '#f3f4f6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <FolderOpen size={14} />
          </button>
          <button
            onClick={handleRefresh}
            title="Refresh"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              color: isDarkTheme ? '#d1d5db' : '#374151',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkTheme ? '#374151' : '#f3f4f6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
      
      {/* File tree */}
      <div 
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0'
        }}
      >
        {(fileTree.length > 0 ? fileTree : mockFileTree).map((node) => (
          <FileTreeItem
            key={node.path}
            node={node}
            depth={0}
            onFileClick={handleFileClick}
            onFolderToggle={handleFolderToggle}
            isDarkTheme={isDarkTheme}
          />
        ))}
      </div>
    </div>
  )
}

function findNodeByPath(tree: FileTreeNode[], path: string): FileTreeNode | null {
  for (const n of tree) {
    if (n.path === path) return n
    if (n.type === 'directory' && n.children) {
      const r = findNodeByPath(n.children, path)
      if (r) return r
    }
  }
  return null
}
