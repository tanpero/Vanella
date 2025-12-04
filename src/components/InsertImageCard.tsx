import React, { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'

export default function InsertImageCard() {
  const { imageCardVisible, imageCardX, imageCardY, hideImageCard, confirmInsertImage } = useEditorStore()
  const [src, setSrc] = useState('')
  const inputRef = useRef<HTMLInputElement|null>(null)

  useEffect(() => {
    if (imageCardVisible) {
      setSrc('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [imageCardVisible])

  if (!imageCardVisible) return null

  const pickFile = async () => {
    try {
      // @ts-ignore
      const [fh] = await (window as any).showOpenFilePicker({ types: [{ description: 'Images', accept: { 'image/*': ['.png','.jpg','.jpeg','.gif','.svg'] } }] })
      const file = await fh.getFile()
      const url = URL.createObjectURL(file)
      setSrc(url)
    } catch {}
  }

  const onConfirm = () => {
    confirmInsertImage(src || '')
  }

  return (
    <div
      style={{ position: 'fixed', left: (imageCardX || 0) + 8, top: (imageCardY || 0) + 8, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(55,65,81,.9)', color: '#fff', borderRadius: 6, padding: '4px 6px', zIndex: 2100 }}
      onMouseDown={e => e.stopPropagation()}
    >
      <span style={{ opacity: .9 }}>🖼️</span>
      <span style={{ color: '#fff' }}>! [ ] (</span>
      <input
        ref={inputRef}
        value={src}
        onChange={e => setSrc(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') hideImageCard() }}
        placeholder="输入图片路径"
        style={{ width: 220, height: 24, border: 'none', outline: 'none', borderRadius: 4, padding: '0 6px', background: '#6b7280', color: '#fff' }}
      />
      <span style={{ color: '#fff' }}>)</span>
      <button onClick={pickFile} title="选择文件" style={{ width: 28, height: 24, border: 'none', borderRadius: 4, background: '#9ca3af', color: '#1f2937', cursor: 'pointer' }}>📁</button>
      <button onClick={onConfirm} title="插入" style={{ marginLeft: 2, height: 24, border: 'none', borderRadius: 4, background: '#10b981', color: '#fff', cursor: 'pointer', padding: '0 8px' }}>插入</button>
      <button onClick={hideImageCard} title="关闭" style={{ marginLeft: 2, height: 24, border: 'none', borderRadius: 4, background: '#ef4444', color: '#fff', cursor: 'pointer', padding: '0 8px' }}>关闭</button>
    </div>
  )
}
