import React, { useEffect, useMemo, useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'

export default function InsertTableDialog() {
  const { tableDialogVisible, tableDialogX, tableDialogY, hideTableDialog, confirmInsertTable } = useEditorStore()
  const [rows, setRows] = useState(2)
  const [cols, setCols] = useState(3)
  const [header, setHeader] = useState(true)
  const [aligns, setAligns] = useState<Array<'left'|'center'|'right'>>(['left', 'left', 'left'])

  useEffect(() => {
    if (tableDialogVisible) {
      setRows(2)
      setCols(3)
      setHeader(true)
      setAligns(['left', 'left', 'left'])
    }
  }, [tableDialogVisible])

  useEffect(() => {
    if (cols !== aligns.length) {
      const next = Array(cols).fill('left') as Array<'left'|'center'|'right'>
      for (let i = 0; i < Math.min(cols, aligns.length); i++) next[i] = aligns[i]
      setAligns(next)
    }
  }, [cols])

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') hideTableDialog() }
    const onClickOutside = () => hideTableDialog()
    if (tableDialogVisible) {
      window.addEventListener('keydown', onEsc)
      window.addEventListener('mousedown', onClickOutside)
    }
    return () => {
      window.removeEventListener('keydown', onEsc)
      window.removeEventListener('mousedown', onClickOutside)
    }
  }, [tableDialogVisible, hideTableDialog])

  if (!tableDialogVisible) return null

  return (
    <div className="ctx-menu" style={{ left: (tableDialogX || 0) + 4, top: (tableDialogY || 0) + 4 }} onMouseDown={e => e.stopPropagation()}>
      <div className="ctx-group">
        <div className="ctx-row" style={{ alignItems: 'center', gap: 8 }}>
          <span>行数</span>
          <input type="number" min={1} max={20} value={rows} onChange={e => setRows(Math.max(1, Math.min(20, parseInt(e.target.value || '1', 10))))} style={{ width: 64 }} />
          <span>列数</span>
          <input type="number" min={1} max={12} value={cols} onChange={e => setCols(Math.max(1, Math.min(12, parseInt(e.target.value || '1', 10))))} style={{ width: 64 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={header} onChange={e => setHeader(e.target.checked)} /> 表头
          </label>
        </div>
      </div>
      <div className="ctx-group">
        <div className="ctx-row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="ctx-item" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>第 {i + 1} 列对齐</span>
              <select value={aligns[i]} onChange={e => {
                const val = (e.target.value as 'left'|'center'|'right')
                setAligns(prev => {
                  const next = prev.slice() as Array<'left'|'center'|'right'>
                  next[i] = val
                  return next
                })
              }}>
                <option value="left">左</option>
                <option value="center">中</option>
                <option value="right">右</option>
              </select>
            </div>
          ))}
        </div>
      </div>
      <div className="ctx-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <button className="ctx-btn" onClick={() => hideTableDialog()}>取消</button>
        <button className="ctx-btn" onClick={() => confirmInsertTable(rows, cols, header, aligns)}>插入表格</button>
      </div>
    </div>
  )
}

