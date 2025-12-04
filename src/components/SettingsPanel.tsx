import React, { useState } from 'react'
import { X, Palette, Type, Keyboard, Save } from 'lucide-react'
import { useEditorStore } from '@/stores/editorStore'

interface SettingsPanelProps {
  className?: string
  onClose?: () => void
}

export default function SettingsPanel({ className = '', onClose }: SettingsPanelProps) {
  const { config, setConfig } = useEditorStore()
  
  const [localConfig, setLocalConfig] = useState({
    theme: config.theme,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    tabSize: config.tabSize,
    autoSave: config.autoSave,
    autoSaveInterval: config.autoSaveInterval
  })
  
  const isDarkTheme = config.theme === 'dark'
  
  const handleSave = () => {
    setConfig(localConfig)
    onClose?.()
  }
  
  const handleReset = () => {
    setLocalConfig({
      theme: 'light',
      fontFamily: 'Consolas, Monaco, monospace',
      fontSize: 14,
      tabSize: 2,
      autoSave: true,
      autoSaveInterval: 5000
    })
  }
  
  const fontFamilies = [
    { value: 'Consolas, Monaco, monospace', label: 'Consolas' },
    { value: 'Monaco, monospace', label: 'Monaco' },
    { value: 'Menlo, monospace', label: 'Menlo' },
    { value: 'Courier New, monospace', label: 'Courier New' },
    { value: 'system-ui, sans-serif', label: 'System UI' }
  ]
  
  const themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' }
  ]
  
  const tabSizes = [2, 4, 8]
  
  return (
    <div 
      className={`settings-panel ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '400px',
        height: '100vh',
        backgroundColor: isDarkTheme ? '#1f2937' : '#ffffff',
        borderLeft: isDarkTheme ? '1px solid #374151' : '1px solid #e5e7eb',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: isDarkTheme ? '1px solid #374151' : '1px solid #e5e7eb'
        }}
      >
        <h2 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: '600',
          color: isDarkTheme ? '#f9fafb' : '#111827'
        }}>
          Settings
        </h2>
        <button
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: isDarkTheme ? '#d1d5db' : '#6b7280',
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
          <X size={16} />
        </button>
      </div>
      
      {/* Content */}
      <div 
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px'
        }}
      >
        {/* Appearance Section */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Palette size={16} color={isDarkTheme ? '#d1d5db' : '#6b7280'} />
            <h3 style={{ 
              margin: 0, 
              fontSize: '16px', 
              fontWeight: '600',
              color: isDarkTheme ? '#f9fafb' : '#111827'
            }}>
              Appearance
            </h3>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontSize: '14px',
              color: isDarkTheme ? '#d1d5db' : '#374151'
            }}>
              Theme
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => setLocalConfig({ ...localConfig, theme: theme.value as 'light' | 'dark' })}
                  style={{
                    padding: '6px 12px',
                    border: localConfig.theme === theme.value 
                      ? '2px solid #3b82f6' 
                      : `1px solid ${isDarkTheme ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '6px',
                    backgroundColor: localConfig.theme === theme.value 
                      ? '#3b82f6' 
                      : 'transparent',
                    color: localConfig.theme === theme.value ? '#ffffff' : (isDarkTheme ? '#d1d5db' : '#374151'),
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Editor Section */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Type size={16} color={isDarkTheme ? '#d1d5db' : '#6b7280'} />
            <h3 style={{ 
              margin: 0, 
              fontSize: '16px', 
              fontWeight: '600',
              color: isDarkTheme ? '#f9fafb' : '#111827'
            }}>
              Editor
            </h3>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontSize: '14px',
              color: isDarkTheme ? '#d1d5db' : '#374151'
            }}>
              Font Family
            </label>
            <select
              value={localConfig.fontFamily}
              onChange={(e) => setLocalConfig({ ...localConfig, fontFamily: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: `1px solid ${isDarkTheme ? '#374151' : '#e5e7eb'}`,
                borderRadius: '6px',
                backgroundColor: isDarkTheme ? '#374151' : '#ffffff',
                color: isDarkTheme ? '#d1d5db' : '#374151',
                fontSize: '14px'
              }}
            >
              {fontFamilies.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontSize: '14px',
              color: isDarkTheme ? '#d1d5db' : '#374151'
            }}>
              Font Size: {localConfig.fontSize}px
            </label>
            <input
              type="range"
              min="10"
              max="24"
              value={localConfig.fontSize}
              onChange={(e) => setLocalConfig({ ...localConfig, fontSize: parseInt(e.target.value) })}
              style={{
                width: '100%',
                height: '4px',
                borderRadius: '2px',
                background: isDarkTheme ? '#374151' : '#e5e7eb',
                outline: 'none',
                WebkitAppearance: 'none'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontSize: '14px',
              color: isDarkTheme ? '#d1d5db' : '#374151'
            }}>
              Tab Size
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {tabSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setLocalConfig({ ...localConfig, tabSize: size })}
                  style={{
                    padding: '6px 12px',
                    border: localConfig.tabSize === size 
                      ? '2px solid #3b82f6' 
                      : `1px solid ${isDarkTheme ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '6px',
                    backgroundColor: localConfig.tabSize === size 
                      ? '#3b82f6' 
                      : 'transparent',
                    color: localConfig.tabSize === size ? '#ffffff' : (isDarkTheme ? '#d1d5db' : '#374151'),
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: isDarkTheme ? '#d1d5db' : '#374151',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={localConfig.autoSave}
                onChange={(e) => setLocalConfig({ ...localConfig, autoSave: e.target.checked })}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer'
                }}
              />
              Auto-save
            </label>
          </div>
          
          {localConfig.autoSave && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontSize: '14px',
                color: isDarkTheme ? '#d1d5db' : '#374151'
              }}>
                Auto-save interval: {localConfig.autoSaveInterval / 1000}s
              </label>
              <input
                type="range"
                min="1000"
                max="30000"
                step="1000"
                value={localConfig.autoSaveInterval}
                onChange={(e) => setLocalConfig({ ...localConfig, autoSaveInterval: parseInt(e.target.value) })}
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  background: isDarkTheme ? '#374151' : '#e5e7eb',
                  outline: 'none',
                  WebkitAppearance: 'none'
                }}
              />
            </div>
          )}
        </div>
        
        {/* Shortcuts Section */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Keyboard size={16} color={isDarkTheme ? '#d1d5db' : '#6b7280'} />
            <h3 style={{ 
              margin: 0, 
              fontSize: '16px', 
              fontWeight: '600',
              color: isDarkTheme ? '#f9fafb' : '#111827'
            }}>
              Keyboard Shortcuts
            </h3>
          </div>
          
          <div style={{ fontSize: '14px', color: isDarkTheme ? '#d1d5db' : '#374151' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>New File</span>
              <kbd style={{ 
                backgroundColor: isDarkTheme ? '#374151' : '#f3f4f6',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>Ctrl+N</kbd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Open File</span>
              <kbd style={{ 
                backgroundColor: isDarkTheme ? '#374151' : '#f3f4f6',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>Ctrl+O</kbd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Save File</span>
              <kbd style={{ 
                backgroundColor: isDarkTheme ? '#374151' : '#f3f4f6',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>Ctrl+S</kbd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Bold</span>
              <kbd style={{ 
                backgroundColor: isDarkTheme ? '#374151' : '#f3f4f6',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>Ctrl+B</kbd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Italic</span>
              <kbd style={{ 
                backgroundColor: isDarkTheme ? '#374151' : '#f3f4f6',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>Ctrl+I</kbd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Link</span>
              <kbd style={{ 
                backgroundColor: isDarkTheme ? '#374151' : '#f3f4f6',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>Ctrl+K</kbd>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderTop: isDarkTheme ? '1px solid #374151' : '1px solid #e5e7eb'
        }}
      >
        <button
          onClick={handleReset}
          style={{
            padding: '8px 16px',
            border: `1px solid ${isDarkTheme ? '#374151' : '#e5e7eb'}`,
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: isDarkTheme ? '#d1d5db' : '#374151',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDarkTheme ? '#374151' : '#f3f4f6'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          Reset to Defaults
        </button>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: `1px solid ${isDarkTheme ? '#374151' : '#e5e7eb'}`,
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: isDarkTheme ? '#d1d5db' : '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkTheme ? '#374151' : '#f3f4f6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6'
            }}
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </div>
    </div>
  )
}