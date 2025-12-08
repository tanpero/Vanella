import React, { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { exportRevealToHTML } from '@/utils/export'

type SlidesPreviewProps = {
  visible: boolean
  content: string
  title?: string
  onClose: () => void
}

export default function SlidesPreview({ visible, content, title = 'Slides Preview', onClose }: SlidesPreviewProps) {
  const { config } = useEditorStore()
  const [html, setHtml] = useState<string>('')
  const [url, setUrl] = useState<string>('')
  const [autoplay, setAutoplay] = useState<boolean>(false)
  const [intervalSec, setIntervalSec] = useState<number>(5)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isDark = config.theme === 'dark'

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    ;(async () => {
      const htmlContent = await exportRevealToHTML(content, title)
      if (cancelled) return
      setHtml(htmlContent)
    })()
    return () => { cancelled = true }
  }, [visible, content, title])

  useEffect(() => {
    if (!visible || !html) return
    const blob = new Blob([html], { type: 'text/html' })
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => { URL.revokeObjectURL(u); setUrl('') }
  }, [visible, html])

  useEffect(() => {
    type RevealDeck = { next: () => void }
    type RevealWindow = Window & { Reveal?: RevealDeck }
    let timer: number | undefined
    const run = () => {
      const win = iframeRef.current?.contentWindow as RevealWindow | undefined
      const deck = win && win.Reveal
      if (deck && typeof deck.next === 'function') deck.next()
    }
    if (autoplay && visible && url) {
      timer = window.setInterval(run, Math.max(1, intervalSec) * 1000)
    }
    return () => { if (timer) window.clearInterval(timer) }
  }, [autoplay, intervalSec, visible, url])

  const handleToggleFullscreen = async () => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      await el.requestFullscreen()
      setIsFullscreen(true)
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: isFullscreen ? '100vw' : '60vw',
          height: isFullscreen ? '100vh' : '60vh',
          backgroundColor: isDark ? '#0b1220' : '#ffffff',
          color: isDark ? '#e5e7eb' : '#111827',
          border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          borderRadius: '8px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, opacity: 0.9 }}>{title}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} />
              <span>自动播放</span>
            </label>
            <input
              type="number"
              min={1}
              value={intervalSec}
              onChange={(e) => setIntervalSec(Math.max(1, parseInt(e.target.value || '5')))}
              style={{ width: '56px', padding: '4px 6px', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, borderRadius: '6px', backgroundColor: isDark ? '#111827' : '#ffffff', color: isDark ? '#e5e7eb' : '#111827' }}
            />
            <span style={{ fontSize: '12px' }}>秒/页</span>
            <button
              onClick={handleToggleFullscreen}
              style={{ padding: '6px 10px', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, borderRadius: '6px', background: 'transparent', color: isDark ? '#e5e7eb' : '#111827', cursor: 'pointer' }}
            >
              {isFullscreen ? '退出全屏' : '全屏'}
            </button>
            <button
              onClick={() => { setAutoplay(false); onClose() }}
              style={{ padding: '6px 10px', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, borderRadius: '6px', background: 'transparent', color: isDark ? '#e5e7eb' : '#111827', cursor: 'pointer' }}
            >
              关闭
            </button>
          </div>
        </div>
        <div style={{ flex: 1, backgroundColor: isDark ? '#0b1220' : '#ffffff' }}>
          {url && (
            <iframe ref={iframeRef} title={title} src={url} style={{ width: '100%', height: '100%', border: 'none' }} />
          )}
        </div>
      </div>
    </div>
  )
}
