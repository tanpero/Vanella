import React from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { ChevronUp, ChevronDown, X, Search, Eraser, RulerDimensionLine } from 'lucide-react'

export default function SearchToolbar() {
  const {
    config,
    editorMode,
    searchVisible,
    searchMode,
    searchQuery,
    replaceQuery,
    regexEnabled,
    wholeWord,
    
    searchIndex,
    searchCount,
    setSearchQuery,
    setReplaceQuery,
    openFindToolbar,
    openReplaceToolbar,
    closeSearchToolbar,
    toggleRegex,
    toggleCaseSensitive,
    toggleWholeWord,
    findNext,
    findPrev,
    replaceOne,
    replaceAll
  } = useEditorStore()

  if (!searchVisible) return null
  const isDark = config.theme === 'dark'

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) findPrev()
      else findNext()
      e.preventDefault()
    }
  }

  const handleReplaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      replaceOne()
      e.preventDefault()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        top: 12,
        zIndex: 50,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        padding: '6px 10px',
        borderRadius: 8,
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
        boxShadow: '0 4px 10px rgba(0,0,0,.08)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          title="查找"
          onClick={openFindToolbar}
          style={{ border: 'none', background: 'transparent', color: isDark ? '#d1d5db' : '#374151', cursor: 'pointer' }}
        ><Search size={16} /></button>
        <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>•</span>
        <button
          title="替换"
          onClick={openReplaceToolbar}
          style={{ border: 'none', background: 'transparent', color: isDark ? '#d1d5db' : '#374151', cursor: 'pointer' }}
        ><Eraser size={16} /></button>
      </div>

      <input
        autoFocus
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleSearchKeyDown}
        placeholder={editorMode === 'classic' ? '在文档中查找…' : '在源码中查找…'}
        style={{ flex: 1, minWidth: 120, height: 28, padding: '0 8px', borderRadius: 6, border: isDark ? '1px solid #374151' : '1px solid #e5e7eb', background: 'transparent', color: isDark ? '#e5e7eb' : '#374151' }}
      />

      {searchMode === 'replace' && (
        <input
          value={replaceQuery}
          onChange={(e) => setReplaceQuery(e.target.value)}
          onKeyDown={handleReplaceKeyDown}
          placeholder={editorMode === 'classic' ? '替换为…' : '替换为…'}
          style={{ flex: 1, minWidth: 120, height: 28, padding: '0 8px', borderRadius: 6, border: isDark ? '1px solid #374151' : '1px solid #e5e7eb', background: 'transparent', color: isDark ? '#e5e7eb' : '#374151' }}
        />
      )}

      <button
        title="大小写敏感"
        onClick={toggleCaseSensitive}
        style={{ border: 'none', background: 'transparent', color: isDark ? '#d1d5db' : '#374151', cursor: 'pointer', padding: '0 6px' }}
      >Aa</button>

      <button
        title="全字匹配"
        onClick={toggleWholeWord}
        style={{ border: 'none', background: 'transparent', color: wholeWord ? '#2563eb' : (isDark ? '#d1d5db' : '#374151'), cursor: 'pointer', padding: '0 6px' }}
      ><RulerDimensionLine size={16} /></button>

      <button
        title="正则表达式"
        onClick={toggleRegex}
        style={{ border: 'none', background: 'transparent', color: regexEnabled ? '#2563eb' : (isDark ? '#d1d5db' : '#374151'), cursor: 'pointer', padding: '0 6px' }}
      >(.*)</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: isDark ? '#9ca3af' : '#6b7280', minWidth: 60, justifyContent: 'center' }}>
        <span>{searchCount > 0 ? (searchIndex + 1) : 0} / {searchCount}</span>
      </div>

      <button
        onClick={findPrev}
        title="上一个"
        style={{ border: 'none', background: 'transparent', color: isDark ? '#d1d5db' : '#374151', cursor: 'pointer' }}
      ><ChevronUp size={16} /></button>
      <button
        onClick={findNext}
        title="下一个"
        style={{ border: 'none', background: 'transparent', color: isDark ? '#d1d5db' : '#374151', cursor: 'pointer' }}
      ><ChevronDown size={16} /></button>

      {searchMode === 'replace' && (
        <>
          <button
            onClick={replaceAll}
            title="全部"
            style={{ border: 'none', background: 'transparent', color: isDark ? '#d1d5db' : '#374151', cursor: 'pointer', padding: '0 6px' }}
          >全部</button>
          <button
            onClick={replaceOne}
            title="替换"
            style={{ border: 'none', background: 'transparent', color: isDark ? '#d1d5db' : '#374151', cursor: 'pointer', padding: '0 6px' }}
          >替换</button>
        </>
      )}

      <button
        onClick={closeSearchToolbar}
        title="关闭"
        style={{ border: 'none', background: 'transparent', color: isDark ? '#d1d5db' : '#374151', cursor: 'pointer' }}
      ><X size={16} /></button>
    </div>
  )
}
