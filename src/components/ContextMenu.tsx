import React, { useEffect } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import '@/styles/context-menu.css'

export default function ContextMenu() {
  const { ctxVisible, ctxX, ctxY, hideContextMenu, runClassicCommand, showImageCard } = useEditorStore()

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') hideContextMenu() }
    const onClickOutside = () => hideContextMenu()
    if (ctxVisible) {
      window.addEventListener('keydown', onEsc)
      window.addEventListener('mousedown', onClickOutside)
    }
    return () => {
      window.removeEventListener('keydown', onEsc)
      window.removeEventListener('mousedown', onClickOutside)
    }
  }, [ctxVisible, hideContextMenu])

  if (!ctxVisible) return null

  return (
    <div className="ctx-menu" style={{ left: (ctxX || 0) + 4, top: (ctxY || 0) + 4 }} onMouseDown={e => e.stopPropagation()}>
      <div className="ctx-row">
        <button className="ctx-icon" title="剪切">✂️</button>
        <button className="ctx-icon" title="复制" onClick={() => document.execCommand('copy')}>📋</button>
        <button className="ctx-icon" title="粘贴">📥</button>
        <button className="ctx-icon" title="重复">📑</button>
        <button className="ctx-icon" title="删除" onClick={() => runClassicCommand('paragraph')}>🗑️</button>
      </div>
      <div className="ctx-group">
        <button className="ctx-item" disabled>复制 / 粘贴为…</button>
      </div>
      <div className="ctx-row">
        <button className="ctx-btn" onClick={() => runClassicCommand('bold')}>B</button>
        <button className="ctx-btn" onClick={() => runClassicCommand('italic')}>I</button>
        <button className="ctx-btn" onClick={() => runClassicCommand('code')}>{`</>`}</button>
        <button className="ctx-btn" onClick={() => runClassicCommand('link', { href: '' })}>🔗</button>
        <button className="ctx-btn" onClick={() => runClassicCommand('blockquote')}>❝</button>
        <button className="ctx-btn" onClick={() => runClassicCommand('bullet_list')}>•</button>
        <button className="ctx-btn" onClick={() => runClassicCommand('ordered_list')}>1.</button>
        <button className="ctx-btn" onClick={() => runClassicCommand('task_list')}>✓</button>
      </div>
      <div className="ctx-group">
        <details className="ctx-sub">
          <summary>段落</summary>
          <button className="ctx-item" onClick={() => runClassicCommand('heading', { level: 1 })}>一级标题  Ctrl+1</button>
          <button className="ctx-item" onClick={() => runClassicCommand('heading', { level: 2 })}>二级标题  Ctrl+2</button>
          <button className="ctx-item" onClick={() => runClassicCommand('heading', { level: 3 })}>三级标题  Ctrl+3</button>
          <button className="ctx-item" onClick={() => runClassicCommand('heading', { level: 4 })}>四级标题  Ctrl+4</button>
          <button className="ctx-item" onClick={() => runClassicCommand('heading', { level: 5 })}>五级标题  Ctrl+5</button>
          <button className="ctx-item" onClick={() => runClassicCommand('heading', { level: 6 })}>六级标题  Ctrl+6</button>
          <button className="ctx-item" onClick={() => runClassicCommand('paragraph')}>段落  Ctrl+0</button>
        </details>
      </div>
      <div className="ctx-group">
        <details className="ctx-sub">
          <summary>插入</summary>
          <button className="ctx-item" onClick={() => showImageCard(ctxX || 0, ctxY || 0)}>图片  Ctrl+Shift+I</button>
          <button className="ctx-item" disabled>脚注</button>
          <button className="ctx-item" disabled>链接引用</button>
          <button className="ctx-item" onClick={() => runClassicCommand('horizontal_rule')}>水平分割线</button>
          <button className="ctx-item" onClick={() => runClassicCommand('table')}>表格  Ctrl+T</button>
          <button className="ctx-item" onClick={() => runClassicCommand('code_block')}>代码块  Ctrl+Shift+K</button>
          <button className="ctx-item" onClick={() => runClassicCommand('math_block')}>公式块  Ctrl+Shift+M</button>
          <button className="ctx-item" disabled>内容目录</button>
          <button className="ctx-item" disabled>段落（上方）</button>
          <button className="ctx-item" disabled>段落（下方）</button>
        </details>
      </div>
    </div>
  )
}
