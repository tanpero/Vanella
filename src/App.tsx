import { HashRouter as Router, Routes, Route } from "react-router-dom"
import Home from "@/pages/Home"
import { useEditorStore } from "@/stores/editorStore"
import { useEffect } from "react"

export default function App() {
  const { config } = useEditorStore()
  
  useEffect(() => {
    // Apply theme to the document
    if (config.theme === 'dark') {
      document.documentElement.classList.add('dark')
      document.body.style.backgroundColor = '#111827'
      document.body.style.color = '#d1d5db'
    } else {
      document.documentElement.classList.remove('dark')
      document.body.style.backgroundColor = '#ffffff'
      document.body.style.color = '#374151'
    }
  }, [config.theme])

  useEffect(() => {
    const handleViteError = (payload: unknown) => {
      const p = payload as { err?: { message?: string; stack?: string; frame?: string }; id?: string; plugin?: string }
      const msg = p?.err?.message || 'Unknown Vite error'
      const frame = p?.err?.frame || ''
      const stack = p?.err?.stack || ''
      const plugin = p?.plugin || ''
      const id = (p as { id?: string })?.id || ''
      const text = [msg, frame, stack].filter(Boolean).join('\n')
      console.groupCollapsed('%c[Vite Error]%c ' + (plugin || ''), 'color:#dc2626;font-weight:bold', 'color:#6b7280')
      if (id) console.log('file:', id)
      console.log(text)
      console.groupEnd()
      ;(window as unknown as { __viteErrorInfo?: unknown }).__viteErrorInfo = { msg, frame, stack, plugin, id, raw: payload }
      window.dispatchEvent(new CustomEvent('vite-error-handled'))
    }

    const observeOverlay = () => {
      const ro = new MutationObserver(() => {
        const el = document.querySelector('vite-error-overlay') as HTMLElement | null
        if (!el) return
        const txt = (el.shadowRoot?.textContent || el.textContent || '').trim()
        if (txt) {
          console.groupCollapsed('%c[Vite Overlay]%c captured', 'color:#dc2626;font-weight:bold', 'color:#6b7280')
          console.log(txt)
          console.groupEnd()
        }
      })
      ro.observe(document.documentElement, { childList: true, subtree: true })
      return ro
    }

    let overlayObserver: MutationObserver | null = null
    if (import.meta.hot) {
      import.meta.hot.on('vite:error', handleViteError)
      overlayObserver = observeOverlay()
    }
    return () => {
      if (import.meta.hot) {
        import.meta.hot.off?.('vite:error', handleViteError as unknown as (p: unknown) => void)
      }
      overlayObserver?.disconnect()
    }
  }, [])
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<div className="text-center text-xl p-8">Settings Page - Coming Soon</div>} />
        <Route path="/about" element={<div className="text-center text-xl p-8">About Page - Coming Soon</div>} />
      </Routes>
    </Router>
  )
}
