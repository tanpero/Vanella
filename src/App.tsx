import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
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
