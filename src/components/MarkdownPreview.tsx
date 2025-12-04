import React, { useEffect, useRef } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { parseMarkdown } from '@/utils/markdown'

interface MarkdownPreviewProps {
  className?: string
}

export default function MarkdownPreview({ className = '' }: MarkdownPreviewProps) {
  const { activeFile, config } = useEditorStore()
  const previewRef = useRef<HTMLDivElement>(null)
  
  const isDarkTheme = config.theme === 'dark'
  
  useEffect(() => {
    if (previewRef.current && activeFile?.content) {
      const html = parseMarkdown(activeFile.content)
      previewRef.current.innerHTML = html
    }
  }, [activeFile?.content])
  
  const previewStyles = `
    .markdown-preview {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: ${isDarkTheme ? '#d1d5db' : '#374151'};
      background-color: ${isDarkTheme ? '#1f2937' : '#ffffff'};
    }
    
    .markdown-preview h1 {
      font-size: 2em;
      margin: 0.67em 0;
      font-weight: 600;
      border-bottom: 2px solid ${isDarkTheme ? '#374151' : '#e5e7eb'};
      padding-bottom: 0.3em;
    }
    
    .markdown-preview h2 {
      font-size: 1.5em;
      margin: 0.75em 0;
      font-weight: 600;
      border-bottom: 1px solid ${isDarkTheme ? '#374151' : '#e5e7eb'};
      padding-bottom: 0.3em;
    }
    
    .markdown-preview h3 {
      font-size: 1.25em;
      margin: 0.83em 0;
      font-weight: 600;
    }
    
    .markdown-preview h4 {
      font-size: 1em;
      margin: 1em 0;
      font-weight: 600;
    }
    
    .markdown-preview h5 {
      font-size: 0.875em;
      margin: 1.5em 0;
      font-weight: 600;
    }
    
    .markdown-preview h6 {
      font-size: 0.75em;
      margin: 1.67em 0;
      font-weight: 600;
      color: ${isDarkTheme ? '#9ca3af' : '#6b7280'};
    }
    
    .markdown-preview p {
      margin: 1em 0;
    }
    
    .markdown-preview ul, .markdown-preview ol {
      margin: 1em 0;
      padding-left: 2em;
    }
    
    .markdown-preview li {
      margin: 0.5em 0;
    }
    
    .markdown-preview blockquote {
      margin: 1em 0;
      padding: 0 1em;
      border-left: 4px solid ${isDarkTheme ? '#374151' : '#e5e7eb'};
      background-color: ${isDarkTheme ? '#37415120' : '#f9fafb'};
      font-style: italic;
    }
    
    .markdown-preview code {
      background-color: ${isDarkTheme ? '#374151' : '#f3f4f6'};
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: Consolas, Monaco, monospace;
      font-size: 0.9em;
    }
    
    .markdown-preview pre {
      background-color: ${isDarkTheme ? '#111827' : '#f8f9fa'};
      padding: 1em;
      border-radius: 6px;
      overflow-x: auto;
      border: 1px solid ${isDarkTheme ? '#374151' : '#e5e7eb'};
    }
    
    .markdown-preview pre code {
      background-color: transparent;
      padding: 0;
      border-radius: 0;
    }
    
    .markdown-preview a {
      color: #3b82f6;
      text-decoration: none;
    }
    
    .markdown-preview a:hover {
      text-decoration: underline;
    }
    
    .markdown-preview table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    
    .markdown-preview th, .markdown-preview td {
      border: 1px solid ${isDarkTheme ? '#374151' : '#e5e7eb'};
      padding: 0.75em;
      text-align: left;
    }
    
    .markdown-preview th {
      background-color: ${isDarkTheme ? '#374151' : '#f3f4f6'};
      font-weight: 600;
    }
    
    .markdown-preview img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
    }
    
    .markdown-preview hr {
      border: none;
      border-top: 1px solid ${isDarkTheme ? '#374151' : '#e5e7eb'};
      margin: 2em 0;
    }
    
    .markdown-preview strong {
      font-weight: 600;
    }
    
    .markdown-preview em {
      font-style: italic;
    }
  `
  
  return (
    <div 
      className={`markdown-preview-container ${className}`}
      style={{
        height: '100%',
        overflowY: 'auto',
        backgroundColor: isDarkTheme ? '#1f2937' : '#ffffff'
      }}
    >
      <style>{previewStyles}</style>
      <div 
        ref={previewRef}
        className="markdown-preview"
        style={{
          padding: '24px',
          minHeight: '100%'
        }}
      >
        {activeFile?.content ? (
          <div dangerouslySetInnerHTML={{ 
            __html: parseMarkdown(activeFile.content) 
          }} />
        ) : (
          <div style={{ 
            textAlign: 'center', 
            color: isDarkTheme ? '#6b7280' : '#9ca3af',
            fontStyle: 'italic',
            marginTop: '50px'
          }}>
            Start writing to see the preview...
          </div>
        )}
      </div>
    </div>
  )
}