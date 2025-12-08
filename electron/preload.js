const { contextBridge, ipcRenderer } = require('electron')

  contextBridge.exposeInMainWorld('api', {
    hashSha256: (text) => ipcRenderer.invoke('hash-sha256', text),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    saveFile: (filePath, content) => ipcRenderer.invoke('save-file', { filePath, content }),
    onOpenFile: (cb) => {
      ipcRenderer.on('open-md-file', (_evt, filePath) => {
        try { if (cb) cb(filePath) } catch {}
      })
    }
  })
