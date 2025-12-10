import React, { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import type { EditorState } from 'prosemirror-state'
import { TextSelection } from 'prosemirror-state'
import { addRowAfter, addRowBefore, addColumnAfter, addColumnBefore, deleteRow, deleteColumn } from 'prosemirror-tables'

/*
  表格上下文菜单工具栏
  - 通过右键触发，自动锚定到当前表格位置并显示操作
  - 行/列增删操作由 prosemirror-tables 提供
  - 支持设置当前列对齐（left/center/right），写回到 table.attrs.colalign
  - 同步 DOM 单元格样式以即时反馈
*/

// 查找当前选区所在的表格节点、其位置以及列索引
function getTableInfo(state: EditorState) {
  const $pos = state.selection.$from
  let tableDepth = -1
  let rowDepth = -1
  let cellDepth = -1
  for (let d = $pos.depth; d > 0; d--) {
    const name = $pos.node(d).type.name
    if (name === 'table' && tableDepth < 0) tableDepth = d
    if (name === 'table_row' && rowDepth < 0) rowDepth = d
    if ((name === 'table_cell' || name === 'table_header') && cellDepth < 0) cellDepth = d
  }
  if (tableDepth < 0) return null
  const tablePos = $pos.before(tableDepth)
  const tableNode = $pos.node(tableDepth)
  const colIndex = rowDepth >= 0 ? $pos.index(rowDepth) : 0
  return { tablePos, tableNode, colIndex }
}

export default function TableToolbar() {
  const { pmView } = useEditorStore()
  const [visible, setVisible] = useState(false)
  const [colAlign, setColAlign] = useState<'left'|'center'|'right'>('left')
  const [anchor, setAnchor] = useState<{ left: number; top: number }>({ left: 16, top: 16 })
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!pmView) return
    // 将对齐设置应用到当前表格的每个单元格（考虑 colspan）
    const applyDomAlign = (tableEl: HTMLElement, aligns: Array<'left'|'center'|'right'>) => {
      const rows = Array.from(tableEl.querySelectorAll('tr'))
      rows.forEach(row => {
        const cells = Array.from(row.children).filter(el => {
          const tag = (el as HTMLElement).tagName
          return tag === 'TD' || tag === 'TH'
        }) as HTMLElement[]
        let col = 0
        for (const cell of cells) {
          const csAttr = cell.getAttribute('colspan') || '1'
          const cs = Math.max(1, parseInt(csAttr, 10) || 1)
          const a = aligns[col] || 'left'
          cell.style.textAlign = a
          col += cs
        }
      })
    }

    const onUpdate = () => {
      const st = pmView.state
      const info = getTableInfo(st)
      if (!info) { if (visible) setVisible(false); return }
      if (visible) {
        const aligns = (info.tableNode.attrs?.colalign || []) as Array<'left'|'center'|'right'>
        const idx = Math.max(0, Math.min(info.colIndex, Math.max(0, aligns.length - 1)))
        setColAlign((aligns[idx] || 'left') as 'left'|'center'|'right')
        const tableEl = pmView.nodeDOM(info.tablePos) as HTMLElement | null
        if (tableEl) applyDomAlign(tableEl, aligns)
      }
    }
    const origDispatch = pmView.dispatch
    pmView.dispatch = (tr) => { origDispatch.call(pmView, tr); onUpdate() }

    // 右键显示上下文菜单，并将选区移动到所点单元格
    const handleContextMenu = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement
      const tableEl = target?.closest('table') as HTMLElement | null
      if (!tableEl) { setVisible(false); return }
      ev.preventDefault()
      const cellEl = target.closest('td,th') as HTMLElement | null
      if (cellEl) {
        try {
          const pos = pmView.posAtDOM(cellEl, 0)
          const tr = pmView.state.tr.setSelection(TextSelection.create(pmView.state.doc, Math.max(1, pos + 1)))
          pmView.dispatch(tr)
        } catch { setVisible(true) }
      }
      const vw = window.innerWidth, vh = window.innerHeight
      const menuH = wrapRef.current?.offsetHeight || 120
      const menuW = wrapRef.current?.offsetWidth || 260
      let left = ev.clientX + 4
      let top = ev.clientY + 4
      if (top + menuH > vh - 8) top = Math.max(8, vh - menuH - 8)
      if (left + menuW > vw - 8) left = Math.max(8, vw - menuW - 8)
      setAnchor({ left, top })
      setVisible(true)
      const st = pmView.state
      const info = getTableInfo(st)
      if (info) {
        const aligns = (info.tableNode.attrs?.colalign || []) as Array<'left'|'center'|'right'>
        const idx = Math.max(0, Math.min(info.colIndex, Math.max(0, aligns.length - 1)))
        setColAlign((aligns[idx] || 'left') as 'left'|'center'|'right')
        applyDomAlign(tableEl, aligns)
      }
      const closeOnMouseDown = () => setVisible(false)
      const closeOnEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setVisible(false) }
      window.addEventListener('mousedown', closeOnMouseDown, { once: true })
      window.addEventListener('keydown', closeOnEscape, { once: true })
    }
    pmView.dom.addEventListener('contextmenu', handleContextMenu)

    // 滚动/尺寸变化时调整菜单位置以跟随表格
    const onScroll = () => {
      // 出现时调整位置以免跑到窗口可视范围以外
      if (!visible) return
      const st = pmView.state
      const info = getTableInfo(st)
      if (!info) return
      const tableEl = pmView.nodeDOM(info.tablePos) as HTMLElement | null
      if (!tableEl) return
      const rect = tableEl.getBoundingClientRect()
      const vw = window.innerWidth, vh = window.innerHeight
      const menuH = wrapRef.current?.offsetHeight || 120
      const menuW = wrapRef.current?.offsetWidth || 260
      let left = rect.left + 6
      let top = rect.bottom + 6
      if (top + menuH > vh - 8) top = Math.max(8, rect.bottom - menuH - 6)
      if (left + menuW > vw - 8) left = Math.max(8, rect.left - menuW - 6)
      setAnchor({ left, top })
    }
    pmView.dom.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (pmView) pmView.dispatch = origDispatch
      pmView?.dom.removeEventListener('contextmenu', handleContextMenu)
      pmView?.dom.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [pmView, visible])

  if (!pmView || !visible) return null

  const state = pmView.state
  const info = getTableInfo(state)

  // 设置当前列对齐并写回到 table.attrs.colalign，同时更新 DOM
  const setAlign = (next: 'left'|'center'|'right') => {
    if (!info) return
    const aligns = (info.tableNode.attrs?.colalign || []) as Array<'left'|'center'|'right'>
    const idx = info.colIndex
    const max = Math.max(aligns.length, idx + 1)
    const nextAligns = Array(max).fill('left') as Array<'left'|'center'|'right'>
    for (let i = 0; i < aligns.length; i++) nextAligns[i] = aligns[i]
    nextAligns[idx] = next
    const tr = state.tr.setNodeMarkup(info.tablePos, state.schema.nodes.table, { ...info.tableNode.attrs, colalign: nextAligns })
    pmView.dispatch(tr)
    setColAlign(next)
    try {
      const tableEl = pmView.nodeDOM(info.tablePos) as HTMLElement | null
      if (tableEl) {
        const rows = Array.from(tableEl.querySelectorAll('tr'))
        rows.forEach(row => {
          const cells = Array.from(row.children).filter(el => {
            const tag = (el as HTMLElement).tagName
            return tag === 'TD' || tag === 'TH'
          }) as HTMLElement[]
          let col = 0
          for (const cell of cells) {
            const csAttr = cell.getAttribute('colspan') || '1'
            const cs = Math.max(1, parseInt(csAttr, 10) || 1)
            const a = nextAligns[col] || 'left'
            cell.style.textAlign = a
            col += cs
          }
        })
      }
    } catch { setColAlign(next) }
  }


  return (
    <div ref={wrapRef} className="ctx-menu" style={{ position: 'fixed', left: anchor.left, top: anchor.top }} onMouseDown={e => e.stopPropagation()}>
      <div className="ctx-row" style={{ gap: 6 }}>
        <button className="ctx-btn" onClick={() => addRowBefore(pmView.state, pmView.dispatch)}>上方加一行</button>
        <button className="ctx-btn" onClick={() => addRowAfter(pmView.state, pmView.dispatch)}>下方加一行</button>
        <button className="ctx-btn" onClick={() => deleteRow(pmView.state, pmView.dispatch)}>删除当前行</button>
      </div>
      <div className="ctx-row" style={{ gap: 6 }}>
        <button className="ctx-btn" onClick={() => addColumnBefore(pmView.state, pmView.dispatch)}>左侧加一列</button>
        <button className="ctx-btn" onClick={() => addColumnAfter(pmView.state, pmView.dispatch)}>右侧加一列</button>
        <button className="ctx-btn" onClick={() => deleteColumn(pmView.state, pmView.dispatch)}>删除当前列</button>
      </div>
      
      <div className="ctx-row" style={{ gap: 6, alignItems: 'center' }}>
        <span>当前列对齐</span>
        <select value={colAlign} onChange={e => setAlign(e.target.value as 'left'|'center'|'right')}>
          <option value="left">左</option>
          <option value="center">中</option>
          <option value="right">右</option>
        </select>
      </div>
    </div>
  )
}
